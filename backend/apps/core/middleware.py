"""
Middleware for handling language and localization
"""

class LanguageMiddleware:
    """
    Middleware to capture and store the preferred language from the request
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Get language from headers, query params, or default to 'en'
        language = request.META.get('HTTP_X_LANGUAGE', 'en')
        language = request.GET.get('lang', language)
        
        # Set the language on the request object
        request.language = language if language in ['en', 'ar'] else 'en'
        
        response = self.get_response(request)
        
        # Add language header to response
        response['X-Language'] = request.language
        
        return response
