# Roller ve İzinler

## Roller

| Rol | Kaynak | Yetki |
|-----|--------|-------|
| **Kullanıcı** (`is_admin=false, is_developer=false`) | Varsayılan | Kendi not/klasör/etiketleri, arkadaşlık, paylaşım, kendi analitiği |
| **Yönetici** (`is_admin=true`) | `UPDATE users SET is_admin=true` veya `PATCH /api/admin/users/:id/role` | Tüm kullanıcı/not/günlük/limit yönetimi; `requireAdmin` endpoint’leri |
| **Developer** (`is_developer=true`) | Admin panelinden `PATCH /:id/dev-role` | Normal uygulama yerine `DeveloperPage` (metrik + rate limit paneli) |

Kurallar:
- Kendi rolünü değiştiremezsin (`Kendi rolünüzü değiştiremezsiniz`).
- Engelli kullanıcı admin/developer yapılamaz.
- Son adminin yetkisi kaldırılamaz (`Son yöneticinin yetkisi kaldırılamaz`).
- `is_developer && is_admin` ise admin paneli gösterilir (developer paneli değil).

## Not İzinleri

| İzin | Kim | Ne yapabilir |
|------|-----|--------------|
| `owner` | `notes.user_id = me` | Oku, yaz, paylaş, sil, public link aç/kapat, klasör/pin/tag yönet |
| `edit` | `note_shares.permission='edit'` (arkadaş) | Başlık/içerik yaz, okuma |
| `view` | `note_shares.permission='view'` | Sadece okuma (`Editor` read-only) |
| `none` | Hiçbiri | 404 |

Özel paylaşım sadece `friendships.status='accepted'` ise yapılabilir. Public link tek token, sahibi `owner`’dır.

## İlk Admin

Migration `005_admin.sql`’de `daddydemir@daddydemir.dev` otomatik admin yapılır. Diğer kullanıcıları admin yapmak için DB’den:

```sql
UPDATE users SET is_admin = true WHERE email = 'you@example.com';
```

veya mevcut admin panelinden *Yönetici yap*.
