# EXOTIC OS

¡Este proyecto está configurado y listo para subirse a GitHub y desplegarse en Vercel de forma automática!

## 🚀 Despliegue con GitHub + Vercel (Recomendado)

Dado que es una aplicación basada en **Next.js**, la mejor forma de alojarla es utilizar **Vercel** (los creadores de Next.js). Esto te da velocidad extrema global, despliegue continuo con cada "push" y soporte nativo al instante. Además es **completamente gratuito** para empezar.

### Pasos para desplegar la aplicación:

1. **Sube el código a GitHub:**
   - Abre la terminal en esta carpeta (`club-pos`).
   - Inicializa el repositorio Git:
     ```bash
     git init
     git add .
     git commit -m "Initial commit - Base POS Club"
     ```
   - Crea un repositorio nuevo y vacío en tu cuenta de GitHub.
   - Sigue las instrucciones de GitHub para subir tu código (`git remote add origin https://github.com/TU-USUARIO/TU-REPO.git` y `git push -u origin main`).

2. **Despliegue automático en Vercel:**
   - Ve a [Vercel.com](https://vercel.com) e inicia sesión usando tu cuenta de GitHub.
   - Haz clic en **Add New...** > **Project**.
   - En la lista de repositorios, busca el repositorio que acabas de crear y dale a **Import**.
   - Deja todas las configuraciones por defecto (Vercel detectará automáticamente que es un proyecto Next.js).
   - Haz clic en **Deploy**.

✨ **¡Listo!** En unos minutos tendrás tu URL en vivo y el panel POS funcionará a la perfección.

## 🗄️ Base de Datos en Supabase

Dentro de la carpeta `supabase` tienes el archivo `schema.sql`.

1. Entra a tu proyecto de [Supabase](https://supabase.com).
2. Ve al SQL Editor (panel izquierdo).
3. Copia todo el contenido de `schema.sql` en el editor y dale a "Run".
4. *Nota:* Eventualmente, para conectar el POS real a la base de datos, deberás descomentar las líneas de `supabase.from()` en `app/page.tsx` y poner las credenciales de Supabase en `.env.local` y `lib/supabase.ts`.
