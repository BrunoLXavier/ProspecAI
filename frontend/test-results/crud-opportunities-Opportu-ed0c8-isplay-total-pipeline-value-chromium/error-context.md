# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e3]:
    - button "Toggle theme" [ref=e4] [cursor=pointer]:
      - img [ref=e5]
    - generic [ref=e7]:
      - generic [ref=e8]:
        - img [ref=e10]
        - heading "ProspecAI" [level=2] [ref=e12]
        - paragraph [ref=e13]: Bem-vindo de volta ao ProspecAI
      - generic [ref=e14]:
        - generic [ref=e15]:
          - generic [ref=e16]:
            - generic [ref=e17]: E-mail
            - textbox "E-mail" [ref=e18]:
              - /placeholder: seu@email.com
          - generic [ref=e19]:
            - generic [ref=e20]: Senha
            - generic [ref=e21]:
              - textbox "Senha" [ref=e22]:
                - /placeholder: ••••••••
              - button "Mostrar senha" [ref=e23] [cursor=pointer]:
                - img [ref=e24]
        - generic [ref=e27]:
          - generic [ref=e28]:
            - checkbox "Lembrar-me" [ref=e29]
            - generic [ref=e30]: Lembrar-me
          - link "Esqueceu a senha?" [ref=e31] [cursor=pointer]:
            - /url: /auth/forgot-password
        - button "Entrar" [ref=e32] [cursor=pointer]
      - paragraph [ref=e34]:
        - text: Não tem uma conta?
        - link "Solicitar acesso" [ref=e35] [cursor=pointer]:
          - /url: /auth/contact
```