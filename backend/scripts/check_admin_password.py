import bcrypt


def main():
    admin_hash = b'$2b$12$qr3hqVrfnETJMhNAwiEWFOfpp8jPHMVgiEvMtBzlbTmvOxSRe0Nfy'
    password = b'Admin@123'
    try:
        ok = bcrypt.checkpw(password, admin_hash)
    except Exception as e:
        print('error:', e)
        return
    print('matches' if ok else 'does not match')


if __name__ == '__main__':
    main()
