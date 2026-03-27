from django.db import models
from django.contrib.auth.models import User

class UserActivity(models.Model):
    """Activity log - tracks user actions for audit trails"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    action = models.CharField(max_length=255)  # Action description
    model_name = models.CharField(max_length=100, blank=True, null=True)
    object_id = models.IntegerField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.JSONField(blank=True, null=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name_plural = "User Activities"

    def __str__(self):
        return f"{self.user.username} - {self.action} at {self.timestamp}"

class TransactionStatus(models.Model):
    """Status tracker for asynchronous operations (Async Tasks)"""
    STATUS_CHOICES = [
        ('P', 'Processing'),
        ('C', 'Completed'),
        ('F', 'Failed'),
    ]
    task_id = models.CharField(max_length=255, unique=True)
    task_name = models.CharField(max_length=255)
    status = models.CharField(max_length=1, choices=STATUS_CHOICES, default='P')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    error_message = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.task_name} ({self.get_status_display()})"
