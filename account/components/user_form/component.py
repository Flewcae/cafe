# components/user_form/component.py

from django_components import component
from django.utils.safestring import mark_safe
from account.forms import UserForm


@component.register("user_form")
class UserFormComponent(component.Component):
    template_name = "components/user_form/template.html"

    def get_context_data(
        self,
        instance=None,
        action_url=None,
        form_name=None,
        is_modal=True,
        prefix=None,
        request=None,
    ):
        form = UserForm(
            instance=instance,
            prefix=prefix
        )

        user_id = instance.pk if instance and instance.pk else ""

        if instance and instance.image:
            default_image = instance.image.url
        else:
            default_image = "/media/defaults/user.jpeg"

        if not action_url:
            action_url = (
                f"/edit-account/{user_id}/"
                if user_id
                else "/create-account/"
            )

        return {
            "form": form,
            "action_url": action_url,
            "form_name": form_name or f"userForm_{prefix}",
            "is_modal": is_modal,
            "default_image": default_image,
            "user_id": user_id,
            "prefix": prefix or "id",
        }