from .models import UserActivity

def log_activity(user, action, model_name=None, object_id=None, details=None):
    """
    تسجيل نشاط المستخدم في قاعدة البيانات
    """
    try:
        UserActivity.objects.create(
            user=user,
            action=action,
            model_name=model_name,
            object_id=object_id,
            details=details
        )
    except Exception as e:
        # مش عاوزين الـ logging يوقع العملية الأساسية لو حصل فيه مشكلة
        print(f"Logging Error: {e}")
