from django import forms
from django.core.exceptions import ValidationError
from django.utils.safestring import mark_safe

from common.utils import camel_case
from .models import User

class UserForm(forms.ModelForm):
    phone = forms.CharField(
        max_length=15,
        required=False,
        label='Telefon'
    )
    
    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'image']
        labels = {
            'email': 'E-posta',
            'first_name': 'Ad',
            'last_name': 'Soyad',
            'image': 'Profil Fotoğrafı'
        }

    def __init__(self, *args, action_url=None, csrf_token=None, form_name=None, is_modal=True, **kwargs):
        super().__init__(*args, **kwargs)
        self.user_id = self.instance.pk if self.instance.pk else ''
        self.action_url = action_url
        self.csrf_token = csrf_token  
        self.form_name = form_name  
        self.is_modal = is_modal
        
    def as_custom(self):
        """Form'u tamamen özelleştirilmiş HTML olarak render et"""
        
        # Default image URL
        if self.instance.pk and self.instance.image:
            default_image = self.instance.image.url
        else:
            default_image = '/media/defaults/user.jpeg'
        
        # Action URL belirleme
        if self.action_url:
            action_url = self.action_url
        elif self.instance.pk:
            action_url = f'/edit-account/{self.instance.pk}/'
        else:
            action_url = '/create-account/'

        form_name = self.form_name


        if self.is_modal:
            wrapper_start = f'''
            <div class="modal fade" id="{form_name}" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered modal-lg">
                    <div class="modal-content">
            '''
            wrapper_end = '''
                    </div>
                </div>
            </div>
            '''
        else:
            wrapper_start = '<div class="card"><div class="card-body">'
            wrapper_end = '</div></div>'



        form_inner = f"""
                        <div class="modal-header bg-primary-subtle text-primary">
                            <h5 class="modal-title" id="{form_name}Label">Kullanıcı Bilgileri</h5>
                            {'<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>' if self.is_modal else ''}
                        </div>
                        <div class="modal-body">
                            <!-- Image Preview -->
                            <div class="mb-4">
                                <label class="form-label d-block text-center">{self.fields['image'].label}</label>
                                <div class="image-preview-wrapper">
                                    <img 
                                        id="imagePreview_{self.prefix or 'id'}" 
                                        src="{default_image}" 
                                        alt="Profile Preview" 
                                        class="image-preview"
                                    >
                                    <div class="image-preview-overlay" id="imageOverlay_{self.prefix or 'id'}">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                                    </div>
                                    <button type="button" class="remove-image-btn d-none" id="removeImageBtn_{self.prefix or 'id'}">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                                    </button>
                                </div>
                                <input type="file" name="image" accept="image/*" id="id_image_{self.prefix or 'id'}" class="d-none">
                                <input type="hidden" name="image-clear" id="imageClear_{self.prefix or 'id'}" value="">
                                {self._render_errors('image')}
                            </div>

                            <!-- First Name -->
                            <div class="mb-3">
                                <label for="id_first_name_{self.prefix or 'id'}" class="form-label">{self.fields['first_name'].label}</label>
                                <input type="text" name="first_name" value="{self.data.get('first_name', self.initial.get('first_name', ''))}" 
                                       class="form-control" id="id_first_name_{self.prefix or 'id'}" placeholder="Adınızı girin">
                                {self._render_errors('first_name')}
                            </div>

                            <!-- Last Name -->
                            <div class="mb-3">
                                <label for="id_last_name_{self.prefix or 'id'}" class="form-label">{self.fields['last_name'].label}</label>
                                <input type="text" name="last_name" value="{self.data.get('last_name', self.initial.get('last_name', ''))}" 
                                       class="form-control" id="id_last_name_{self.prefix or 'id'}" placeholder="Soyadınızı girin">
                                {self._render_errors('last_name')}
                            </div>

                            <!-- Email -->
                            <div class="mb-3">
                                <label for="id_email_{self.prefix or 'id'}" class="form-label">{self.fields['email'].label} *</label>
                                <div class="input-group">
                                    <input type="email" name="email" value="{self.data.get('email', self.initial.get('email', ''))}" 
                                           class="form-control" id="id_email_{self.prefix or 'id'}" placeholder="ornek@email.com" required>
                                    <span class="input-group-text d-none" id="emailSpinner_{self.prefix or 'id'}">
                                        <div class="spinner-border spinner-border-sm" role="status">
                                            <span class="visually-hidden">Kontrol ediliyor...</span>
                                        </div>
                                    </span>
                                </div>
                                <div class="validation-feedback d-none" id="emailFeedback_{self.prefix or 'id'}"></div>
                                {self._render_errors('email')}
                            </div>

                            <!-- Phone -->
                            <div class="mb-3">
                                <label for="id_phone_{self.prefix or 'id'}" class="form-label">{self.fields['phone'].label}</label>
                                <div class="input-group">
                                    <input type="text" name="phone" value="{self.data.get('phone', self.initial.get('phone', ''))}" 
                                           class="form-control" id="id_phone_{self.prefix or 'id'}" placeholder="5555555555" maxlength="10">
                                    <span class="input-group-text d-none" id="phoneSpinner_{self.prefix or 'id'}">
                                        <div class="spinner-border spinner-border-sm" role="status">
                                            <span class="visually-hidden">Kontrol ediliyor...</span>
                                        </div>
                                    </span>
                                </div>
                                <div class="validation-feedback d-none" id="phoneFeedback_{self.prefix or 'id'}"></div>
                                {self._render_errors('phone')}
                            </div>
                        </div>
                        <div class="modal-footer">
                            {'<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">İptal</button>' if self.is_modal else ''}
                            <button type="submit" class="btn btn-primary">
                                <i class="bi bi-save"></i> Kaydet
                            </button>
                        </div>
        
        """
        
        html = f'''
        <style>
        .image-preview-wrapper {{
            position: relative;
            width: 150px;
            height: 150px;
            margin: 0 auto 30px;
        }}
        .image-preview {{
            width: 100%;
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
            border: 4px solid #0d6efd;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }}
        .image-preview:hover {{
            transform: scale(1.05);
            border-color: #0a58ca;
        }}
        .image-preview-overlay {{
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s ease;
            cursor: pointer;
        }}
        .image-preview-wrapper:hover .image-preview-overlay {{
            opacity: 1;
        }}
        .image-preview-overlay svg {{
            width: 40px;
            height: 40px;
            fill: white;
        }}
        .remove-image-btn {{
            position: absolute;
            top: 5px;
            right: 5px;
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 50%;
            width: 35px;
            height: 35px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 10;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }}
        .remove-image-btn:hover {{
            background: #c82333;
            transform: scale(1.1);
        }}
        .remove-image-btn svg {{
            width: 20px;
            height: 20px;
            fill: white;
        }}
        .validation-feedback.valid {{
            color: #198754;
        }}
        .validation-feedback.invalid {{
            color: #dc3545;
        }}
        </style>

        {wrapper_start}

        <form method="post" action="{action_url}" enctype="multipart/form-data" id="{form_name}Element_{self.prefix or 'id'}">
            <input type="hidden" name="csrfmiddlewaretoken" value="{self.csrf_token or ''}">
            
            {form_inner}

        </form>

        {wrapper_end}

        <script>
        (function() {{
            const prefix = '{self.prefix or "id"}';
            const userId = '{self.user_id}';
            
            const imageInput = document.getElementById('id_image_' + prefix);
            const imagePreview = document.getElementById('imagePreview_' + prefix);
            const imageOverlay = document.getElementById('imageOverlay_' + prefix);
            const removeImageBtn = document.getElementById('removeImageBtn_' + prefix);
            const imageClear = document.getElementById('imageClear_' + prefix);
            const emailInput = document.getElementById('id_email_' + prefix);
            const phoneInput = document.getElementById('id_phone_' + prefix);
            
            let emailTimeout, phoneTimeout;

            // Image Click Handlers
            imagePreview.addEventListener('click', () => imageInput.click());
            imageOverlay.addEventListener('click', () => imageInput.click());

            // Image Preview
            imageInput.addEventListener('change', function(e) {{
                const file = e.target.files[0];
                if (file) {{
                    const reader = new FileReader();
                    reader.onload = function(e) {{
                        imagePreview.src = e.target.result;
                        removeImageBtn.classList.remove('d-none');
                        imageClear.value = '';
                    }}
                    reader.readAsDataURL(file);
                }}
            }});

            // Remove Image
            removeImageBtn.addEventListener('click', function(e) {{
                e.stopPropagation();
                imagePreview.src = '/media/defaults/user.jpeg';
                imageInput.value = '';
                removeImageBtn.classList.add('d-none');
                imageClear.value = 'on';
            }});

            // Phone Format Handler
            phoneInput.addEventListener('input', function(e) {{
                // Sadece rakamları al
                let value = this.value.replace(/\\D/g, '');
                // Maksimum 10 karakter
                if (value.length > 10) {{
                    value = value.slice(0, 10);
                }}
                
                // Input'a sadece rakamları yaz
                this.value = value;
                
                // Validation'ı tetikle
                clearTimeout(phoneTimeout);
                const phone = value.trim();
                const feedback = document.getElementById('phoneFeedback_' + prefix);
                const spinner = document.getElementById('phoneSpinner_' + prefix);
                
                if (!phone) {{
                    phoneInput.classList.remove('is-valid', 'is-invalid');
                    feedback.classList.remove('d-block');
                    feedback.classList.add('d-none');
                    spinner.classList.add('d-none');
                    return;
                }}

                spinner.classList.remove('d-none');
                phoneInput.classList.remove('is-valid', 'is-invalid');
                feedback.classList.add('d-none');
                feedback.classList.remove('d-block');

                phoneTimeout = setTimeout(() => {{
                    const formData = new FormData();
                    formData.append('phone', phone);
                    if (userId) formData.append('user_id', userId);

                    fetch('/anahtar/api/check-phone', {{
                        method: 'POST',
                        body: formData,
                        headers: {{
                            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || ''
                        }}
                    }})
                    .then(response => response.json())
                    .then(data => {{
                        spinner.classList.add('d-none');
                        if (data.available) {{
                            phoneInput.classList.add('is-valid');
                            phoneInput.classList.remove('is-invalid');
                            feedback.textContent = '✓ Telefon kullanılabilir';
                            feedback.classList.add('valid', 'd-block');
                            feedback.classList.remove('invalid', 'd-none');
                        }} else {{
                            phoneInput.classList.add('is-invalid');
                            phoneInput.classList.remove('is-valid');
                            feedback.textContent = '✗ Bu telefon numarası zaten kullanımda';
                            feedback.classList.add('invalid', 'd-block');
                            feedback.classList.remove('valid', 'd-none');
                        }}
                    }})
                    .catch(error => {{
                        console.error('Error:', error);
                        spinner.classList.add('d-none');
                    }});
                }}, 500);
            }});

            // Email Validation
            emailInput.addEventListener('input', function() {{
                clearTimeout(emailTimeout);
                const email = this.value.trim();
                const feedback = document.getElementById('emailFeedback_' + prefix);
                const spinner = document.getElementById('emailSpinner_' + prefix);
                
                if (!email) {{
                    emailInput.classList.remove('is-valid', 'is-invalid');
                    feedback.classList.remove('d-block');
                    feedback.classList.add('d-none');
                    spinner.classList.add('d-none');
                    return;
                }}

                spinner.classList.remove('d-none');
                emailInput.classList.remove('is-valid', 'is-invalid');
                feedback.classList.add('d-none');
                feedback.classList.remove('d-block');

                emailTimeout = setTimeout(() => {{
                    const formData = new FormData();
                    formData.append('email', email);
                    if (userId) formData.append('user_id', userId);

                    fetch('/anahtar/api/check-email', {{
                        method: 'POST',
                        body: formData,
                        headers: {{
                            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || ''
                        }}
                    }})
                    .then(response => response.json())
                    .then(data => {{
                        spinner.classList.add('d-none');
                        if (data.available) {{
                            emailInput.classList.add('is-valid');
                            emailInput.classList.remove('is-invalid');
                            feedback.textContent = '✓ E-posta kullanılabilir';
                            feedback.classList.add('valid', 'd-block');
                            feedback.classList.remove('invalid', 'd-none');
                        }} else {{
                            emailInput.classList.add('is-invalid');
                            emailInput.classList.remove('is-valid');
                            feedback.textContent = '✗ Bu e-posta adresi zaten kullanımda';
                            feedback.classList.add('invalid', 'd-block');
                            feedback.classList.remove('valid', 'd-none');
                        }}
                    }})
                    .catch(error => {{
                        console.error('Error:', error);
                        spinner.classList.add('d-none');
                    }});
                }}, 500);
            }});
        }})();
        </script>
        '''
        
        return mark_safe(html)
    
    def _render_errors(self, field_name):
        """Field hatalarını render et"""
        if field_name in self.errors:
            errors_html = '<div class="invalid-feedback d-block">'
            for error in self.errors[field_name]:
                errors_html += f'<div>{error}</div>'
            errors_html += '</div>'
            return errors_html
        return ''
    
    def __str__(self):
        """Form'u string olarak çağırınca özel render'ı kullan"""
        return self.as_custom()

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if email:
            qs = User.objects.filter(email=email)
            if self.instance.pk:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise ValidationError('Bu e-posta adresi zaten kullanımda.')
        return email

    def clean_image(self):
        image = self.cleaned_data.get('image')
        
        # Image-clear kontrolü
        if self.data.get('image-clear') == 'on':
            return None
            
        # Eğer image yoksa ve instance'da var ise, mevcut image'i koru
        if not image and self.instance.pk and self.instance.image:
            return self.instance.image
            
        # Yeni image validation
        if image:
            # Dosya boyutu kontrolü (5MB)
            if hasattr(image, 'size') and image.size > 5 * 1024 * 1024:
                raise ValidationError('Resim boyutu 5MB\'dan küçük olmalıdır.')
            
            # Dosya tipi kontrolü
            if hasattr(image, 'content_type'):
                valid_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
                if image.content_type not in valid_types:
                    raise ValidationError('Geçerli bir resim dosyası yükleyin (JPEG, PNG, GIF, WEBP).')
        
        return image
    
    @classmethod
    def create_from_form(cls, form_data, files=None):
        """
        Form verisinden kullanıcı oluşturur ve User nesnesini döndürür
        
        Args:
            form_data: POST verileri (dict veya QueryDict)
            files: FILES verileri (dict veya MultiValueDict), opsiyonel
            
        Returns:
            User: Oluşturulan kullanıcı nesnesi
        """
        # Form verilerini çek
        email = form_data.get('email', None)
        first_name = form_data.get('first_name', None)
        last_name = form_data.get('last_name', None)
        phone = form_data.get('phone', None)
        
        # Image kontrolü
        image = None
        if files:
            image = files.get('image', None)
        
        # Image-clear kontrolü
        image_clear = form_data.get('image-clear', None)
        if image_clear == 'on':
            image = None
        
        # User oluştur
        user = User.objects.create(
            email=email,
            first_name=first_name or '',
            last_name=last_name or '',
        )
        
        # Image varsa kaydet
        if image:
            user.image = image
            user.save()
        
        return user