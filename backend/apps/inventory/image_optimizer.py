import io
import os
from PIL import Image, ImageOps
from django.core.files.base import ContentFile

def compress_and_optimize_image(uploaded_file, max_dimension=800, quality=82) -> ContentFile:
    """
    Compress and optimize an uploaded image file using Pillow.
    - Corrects orientation via EXIF.
    - Converts RGBA/P/CMYK to RGB (or RGBA if transparency is needed in WebP).
    - Resizes to max_dimension (default 800px on longest edge) with Lanczos antialiasing.
    - Saves as high-efficiency WebP format.
    - Returns a ContentFile ready to save in Django ImageField or FileField.
    """
    if not uploaded_file:
        return None
    
    try:
        # If passed an existing Django File / UploadedFile
        if hasattr(uploaded_file, 'file'):
            uploaded_file.seek(0)
            img = Image.open(uploaded_file.file)
        elif hasattr(uploaded_file, 'read'):
            uploaded_file.seek(0)
            img = Image.open(uploaded_file)
        else:
            img = Image.open(uploaded_file)

        # Auto-orient based on EXIF tag
        try:
            img = ImageOps.exif_transpose(img)
        except Exception:
            pass

        # Check mode and handle transparency
        if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
            img = img.convert('RGBA')
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        # Resize proportionally if exceeding max_dimension
        width, height = img.size
        if width > max_dimension or height > max_dimension:
            if width >= height:
                new_width = max_dimension
                new_height = max(1, int(height * (max_dimension / width)))
            else:
                new_height = max_dimension
                new_width = max(1, int(width * (max_dimension / height)))
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Save as WebP with high visual fidelity and compact byte footprint
        buffer = io.BytesIO()
        img.save(buffer, format='WEBP', quality=quality, method=4)
        buffer.seek(0)

        # Generate clean filename with .webp extension
        raw_name = getattr(uploaded_file, 'name', 'product_variant.webp')
        base_name = os.path.splitext(os.path.basename(raw_name))[0] or 'variant'
        new_filename = f"{base_name}.webp"

        return ContentFile(buffer.getvalue(), name=new_filename)
    except Exception as e:
        # Fallback if image parsing fails (e.g. invalid file)
        if hasattr(uploaded_file, 'seek'):
            uploaded_file.seek(0)
        return uploaded_file
