# نظام اللغات - I18n Implementation Guide

## مقدمة
تم تطبيق نظام i18n كامل (Internationalization) يدعم اللغات العربية والإنجليزية في المشروع.

## الميزات الرئيسية

### 1️⃣ الفرونت إند (Frontend)
- **مكتبة i18n-js للترجمات**
- **Language Context API** لإدارة حالة اللغة
- **RTL Support** للعربية
- **Language Selector Component** للتبديل بين اللغات
- **Local Storage** لحفظ اللغة المختارة

### 2️⃣ الباك إند (Backend)
- **Translations Module** للترجمات
- **Language Middleware** للتعامل مع اللغة المرسلة من المستخدم
- **Helper Functions** لإرجاع الاستجابات المترجمة

---

## الاستخدام

### في الفرونت إند

#### 1. استخدام اللغات في المكونات

```javascript
'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function MyComponent() {
  const { t, locale, changeLocale, isRTL } = useLanguage();
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <p>{t('common.welcome')}</p>
      
      {/* تغيير اللغة */}
      <button onClick={() => changeLocale('ar')}>العربية</button>
      <button onClick={() => changeLocale('en')}>English</button>
      
      {/* التحقق من اتجاه النص */}
      {isRTL && <p>النص يذهب من اليمين إلى اليسار</p>}
    </div>
  );
}
```

#### 2. إضافة ترجمات جديدة

في ملفات `src/locales/en.json` و `src/locales/ar.json`:

```json
{
  "myFeature": {
    "title": "My Feature Title",
    "description": "My Feature Description"
  }
}
```

في العربية:
```json
{
  "myFeature": {
    "title": "عنوان الميزة",
    "description": "وصف الميزة"
  }
}
```

#### 3. استخدام المتغيرات في الترجمات

```json
{
  "welcome_message": "Welcome {name}!"
}
```

```javascript
// سيتطلب إضافة معالج للمتغيرات - يمكن تحديثه إذا لزم الأمر
t('welcome_message', { name: 'Ahmed' })
```

### في الباك إند

#### 1. إرسال رسالة مترجمة

```python
from apps.core.utils import error_response, success_response

def my_view(request):
    try:
        # ... do something
        return success_response(
            request, 
            message_key='success_created',
            data={'id': 1, 'name': 'Product'}
        )
    except Exception:
        return error_response(
            request,
            error_key='error_invalid_request',
            status_code=status.HTTP_400_BAD_REQUEST
        )
```

#### 2. إضافة ترجمات جديدة

في `apps/core/translations.py`:

```python
TRANSLATIONS = {
    'en': {
        'my_key': 'English text',
    },
    'ar': {
        'my_key': 'النص العربي',
    }
}
```

#### 3. الحصول على الترجمة

```python
from apps.core.translations import get_translation

# من داخل View
language = request.language  # set by LanguageMiddleware
message = get_translation(language, 'my_key')
```

---

## كيفية التبديل بين اللغات

### من الفرونت إند

1. **استخدام Language Selector** في الـ Sidebar
2. اختر English أو العربية
3. الصفحة ستتحدث تلقائياً:
   - سيتم حفظ الاختيار في localStorage
   - سيتم تحديث `document.documentElement.lang` و `dir`
   - سيتم إرسال اللغة المختارة مع كل API request

### من الباك إند

الـ middleware يكتشف اللغة من:
1. Header: `X-Language`
2. Query Parameter: `?lang=ar`
3. Default: `en`

---

## التغييرات المنفذة

### 📦 Dependencies المضافة
```json
"i18n-js": "^4.5.0"
```

### 🗂️ الملفات المنشأة

**Frontend:**
- `src/locales/en.json` - ترجمة إنجليزي
- `src/locales/ar.json` - ترجمة عربي
- `src/locales/index.js` - دوال المساعدة
- `src/contexts/LanguageContext.js` - Context API
- `src/components/LanguageSelector.js` - مكون التبديل

**Backend:**
- `apps/core/translations.py` - ترجمات الـ API
- `apps/core/middleware.py` - معالج اللغة

### 🔄 الملفات المعدلة

**Frontend:**
- `src/app/providers.js` - إضافة LanguageProvider
- `src/app/layout.js` - جعل lang و dir ديناميي
- `src/app/globals.css` - CSS للـ RTL
- `src/components/Sidebar.js` - إضافة LanguageSelector والترجمات
- `package.json` - إضافة i18n-js

**Backend:**
- `config/settings.py` - إضافة LanguageMiddleware
- `apps/core/utils.py` - إضافة دوال الاستجابة المترجمة

---

## مثال عملي

### السيناريو: عرض قائمة المنتجات

**Sidebar - العربية:**
```
لا بوتيك
- لوحة التحكم
- المخزون
- المبيعات
...
```

**Sidebar - الإنجليزية:**
```
La Boutique
- Dashboard
- Inventory
- Sales
...
```

---

## ملاحظات مهمة

✅ **يدعم RTL** للعربية  
✅ **يحفظ اللغة المختارة** في localStorage  
✅ **يتم التبديل فوراً** بدون إعادة تحميل الصفحة  
✅ **الترجمات في ملفات JSON** سهلة التعديل  
✅ **الباك إند يدعم الترجمات** للرسائل والأخطاء  

---

## الخطوات التالية (اختيارية)

1. **ترجمة جميع الصفحات** - أضف نصوص جميع الصفحات للترجمة
2. **ترجمة الأخطاء** - أضف جميع رسائل الأخطاء الممكنة
3. **Pluralization** - إذا كنت تريد دعم صيغ الجمع
4. **Date/Time Formatting** - حسب اللغة والثقافة
5. **Right-to-Left في جميع المكونات** - تأكد من محاذاة صحيحة

---

**تم الانتهاء بنجاح! ✨**
