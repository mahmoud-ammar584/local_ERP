"""
Translations for the ERP system
"""

TRANSLATIONS = {
    'en': {
        'language': 'English',
        'error_invalid_credentials': 'Invalid username or password',
        'error_user_not_found': 'User not found',
        'error_product_not_found': 'Product not found',
        'error_order_not_found': 'Order not found',
        'error_customer_not_found': 'Customer not found',
        'error_insufficient_stock': 'Insufficient stock',
        'error_invalid_request': 'Invalid request',
        'success_login': 'Login successful',
        'success_created': 'Successfully created',
        'success_updated': 'Successfully updated',
        'success_deleted': 'Successfully deleted',
        'validation_required': 'This field is required',
        'validation_invalid_email': 'Invalid email address',
        'validation_min_length': 'Minimum length is {min_length}',
        'validation_max_length': 'Maximum length is {max_length}',
    },
    'ar': {
        'language': 'العربية',
        'error_invalid_credentials': 'اسم المستخدم أو كلمة المرور غير صحيحة',
        'error_user_not_found': 'المستخدم غير موجود',
        'error_product_not_found': 'المنتج غير موجود',
        'error_order_not_found': 'الطلب غير موجود',
        'error_customer_not_found': 'العميل غير موجود',
        'error_insufficient_stock': 'المخزون غير كافي',
        'error_invalid_request': 'طلب غير صحيح',
        'success_login': 'تم تسجيل الدخول بنجاح',
        'success_created': 'تم الإنشاء بنجاح',
        'success_updated': 'تم التحديث بنجاح',
        'success_deleted': 'تم الحذف بنجاح',
        'validation_required': 'هذا الحقل مطلوب',
        'validation_invalid_email': 'عنوان بريد إلكتروني غير صحيح',
        'validation_min_length': 'الحد الأدنى للطول هو {min_length}',
        'validation_max_length': 'الحد الأقصى للطول هو {max_length}',
    }
}

def get_translation(locale, key, **kwargs):
    """
    Get a translation string
    
    Args:
        locale: Language locale (en, ar)
        key: Translation key
        **kwargs: Variables for string formatting
    
    Returns:
        Translated string or key if not found
    """
    if locale not in TRANSLATIONS:
        locale = 'en'
    
    translation = TRANSLATIONS[locale].get(key, key)
    
    if kwargs:
        try:
            translation = translation.format(**kwargs)
        except (KeyError, ValueError):
            pass
    
    return translation


def get_available_languages():
    """Get list of available languages"""
    return list(TRANSLATIONS.keys())
