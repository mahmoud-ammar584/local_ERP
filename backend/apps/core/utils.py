from .models import UserActivity
from rest_framework.response import Response
from rest_framework import status
from apps.core.translations import get_translation

def log_activity(user, action, model_name=None, object_id=None, details=None):
    """Log user activity to the database"""
    try:
        UserActivity.objects.create(
            user=user,
            action=action,
            model_name=model_name,
            object_id=object_id,
            details=details
        )
    except Exception as e:
        # We don't want logging failures to crash the primary operation.
        print(f"Logging Error: {e}")


def error_response(request, error_key, status_code=status.HTTP_400_BAD_REQUEST, **kwargs):
    """
    Return a localized error response
    
    Args:
        request: HTTP request object
        error_key: Translation key for the error message
        status_code: HTTP status code
        **kwargs: Variables for string formatting
    
    Returns:
        Response object
    """
    language = getattr(request, 'language', 'en')
    message = get_translation(language, error_key, **kwargs)
    
    return Response({
        'error': True,
        'message': message,
        'key': error_key
    }, status=status_code)


def success_response(request, message_key=None, data=None, status_code=status.HTTP_200_OK, **kwargs):
    """
    Return a localized success response
    
    Args:
        request: HTTP request object
        message_key: Translation key for the success message
        data: Response data
        status_code: HTTP status code
        **kwargs: Variables for string formatting
    
    Returns:
        Response object
    """
    language = getattr(request, 'language', 'en')
    
    response_data = {
        'error': False,
        'data': data
    }
    
    if message_key:
        message = get_translation(language, message_key, **kwargs)
        response_data['message'] = message
        response_data['key'] = message_key
    
    return Response(response_data, status=status_code)
