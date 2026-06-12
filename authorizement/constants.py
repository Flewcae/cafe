# authorizement/constants.py
class Perm:
    TABLES = "tables"
    MENU = "menu"
    ORDERS = "orders"
    WAITER = "waiter"
    USERS = "users"
    SYSTEM_SETTINGS = "system_settings"
    AUTHORIZEMENT = "authorizement"
    EMAIL = "email"
    SMS = "sms"
    NOTIFICATION = "notification"

class Action:
    ADD = "add"
    CHANGE = "change"
    DELETE = "delete"
    VIEW = "view"