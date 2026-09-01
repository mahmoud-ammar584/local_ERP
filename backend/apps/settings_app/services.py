import urllib.request
import json
import logging
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from .models import Currency, StoreInfo

logger = logging.getLogger(__name__)

CURRENCY_NAMES = {
    'EGP': 'Egyptian Pound (الجنيه المصري)',
    'EUR': 'Euro (اليورو الأوروبي)',
    'USD': 'US Dollar (الدولار الأمريكي)',
    'GBP': 'British Pound (الجنيه الإسترليني)',
    'AED': 'UAE Dirham (الدرهم الإماراتي)',
    'SAR': 'Saudi Riyal (الريال السعودي)',
    'KWD': 'Kuwaiti Dinar (الدينار الكويتي)',
    'QAR': 'Qatari Riyal (الريال القطري)',
    'TRY': 'Turkish Lira (الليرة التركية)',
    'CNY': 'Chinese Yuan (اليوان الصيني)',
    'CHF': 'Swiss Franc (الفرنك السويسري)',
    'CAD': 'Canadian Dollar (الدولار الكندي)',
    'JPY': 'Japanese Yen (الين الياباني)',
}

DEFAULT_FALLBACK_RATES = {
    'EGP': Decimal('1.0000'),
    'EUR': Decimal('53.8000'),
    'USD': Decimal('48.6500'),
    'GBP': Decimal('63.8000'),
    'AED': Decimal('13.2500'),
    'SAR': Decimal('12.9700'),
    'KWD': Decimal('159.2000'),
    'QAR': Decimal('13.3600'),
    'TRY': Decimal('1.4200'),
    'CNY': Decimal('6.7800'),
    'CHF': Decimal('55.4000'),
}


def fetch_live_rates_from_api(base_currency='EGP') -> dict:
    """
    Fetches live exchange rates relative to EGP using public open exchange rate API.
    Returns a dict of Currency Code -> Exchange Rate to Base (i.e. how many EGP per 1 unit of foreign currency).
    """
    api_url = f"https://open.er-api.com/v6/latest/{base_currency.upper()}"
    calculated_rates = {'EGP': Decimal('1.0000')}

    try:
        req = urllib.request.Request(
            api_url,
            headers={'User-Agent': 'Mozilla/5.0 FunnelERP/1.0'}
        )
        with urllib.request.urlopen(req, timeout=8) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                rates = data.get('rates', {})
                # Rates in response are: 1 EGP = X Foreign Currency
                # We need: 1 Foreign Currency = 1 / X EGP (i.e. exchange_rate_to_base)
                for code in CURRENCY_NAMES.keys():
                    if code == 'EGP':
                        calculated_rates['EGP'] = Decimal('1.0000')
                        continue
                    foreign_per_egp = rates.get(code)
                    if foreign_per_egp and float(foreign_per_egp) > 0:
                        egp_per_foreign = round(Decimal('1.0') / Decimal(str(foreign_per_egp)), 4)
                        calculated_rates[code] = egp_per_foreign
                return calculated_rates
    except Exception as e:
        logger.warning(f"Primary exchange rate API failed: {e}. Trying fallback API...")

    # Secondary API Fallback
    try:
        fallback_url = f"https://api.exchangerate-api.com/v4/latest/{base_currency.upper()}"
        req = urllib.request.Request(
            fallback_url,
            headers={'User-Agent': 'Mozilla/5.0 FunnelERP/1.0'}
        )
        with urllib.request.urlopen(req, timeout=8) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                rates = data.get('rates', {})
                for code in CURRENCY_NAMES.keys():
                    if code == 'EGP':
                        continue
                    foreign_per_egp = rates.get(code)
                    if foreign_per_egp and float(foreign_per_egp) > 0:
                        egp_per_foreign = round(Decimal('1.0') / Decimal(str(foreign_per_egp)), 4)
                        calculated_rates[code] = egp_per_foreign
                return calculated_rates
    except Exception as e:
        logger.error(f"Fallback exchange rate API failed: {e}")

    # Return default fallback rates if both network APIs fail
    return DEFAULT_FALLBACK_RATES


def sync_exchange_rates(company=None) -> dict:
    """
    Syncs live exchange rates and updates Currency records in DB.
    """
    rates = fetch_live_rates_from_api(base_currency='EGP')
    now = timezone.now()

    updated_count = 0
    for code, rate in rates.items():
        name = CURRENCY_NAMES.get(code, f'{code} Currency')
        Currency.objects.update_or_create(
            company=company,
            code=code,
            defaults={
                'name': name,
                'exchange_rate_to_base': rate
            }
        )
        updated_count += 1

    # Update last_rates_sync timestamp in StoreInfo
    store = StoreInfo.load(company=company)
    store.last_rates_sync = now
    store.save(update_fields=['last_rates_sync'])

    return {
        'rates': {k: float(v) for k, v in rates.items()},
        'updated_count': updated_count,
        'last_sync': now.isoformat()
    }


def maybe_auto_sync_rates(company=None):
    """
    Checks if 4 hours have passed since last sync; if so, performs automatic sync in background.
    """
    try:
        store = StoreInfo.load(company=company)
        now = timezone.now()
        if not store.last_rates_sync or (now - store.last_rates_sync) > timedelta(hours=4):
            sync_exchange_rates(company=company)
    except Exception as e:
        logger.warning(f"Failed in maybe_auto_sync_rates: {e}")
