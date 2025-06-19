# PromoZone

Ovdje se nalazi backend projekta iz kolegija Web aplikacije.

# Izrađeno

- Express + MongoDB backend s centraliziranom konekcijom i seed skriptom koja ubacuje testne korisnike
- Scraper koji povlači podatke o trgovinama
- Testne podatke pohranjene u bazi
- Osnovni frontend u drugom repozitoriju

# Kontrolna lista projekta

## 🔒 Unapređenje backenda

- [ ] Heširaj lozinke (npr. bcrypt + salt)
- [ ] Izdaj i provjeri JWT-ove (ili sesije) prilikom prijave
- [ ] Zaštiti rute auth middleware-om
- [ ] Dodaj validaciju zahtjeva (Joi ili Zod)
- [ ] Standardiziraj formate odgovora o pogreškama
- [ ] Ograniči broj zahtjeva na osjetljive endpoint-e

## 🤖 Scraper i podaci

- [ ] Rasporedi scraper kao pozadinski zadatak (CRON/Bull)
- [ ] Spremaj povijest izvršavanja scrapera u Mongo
- [ ] Definiraj i primijeni sheme za trgovine/letke/proizvode
- [ ] Dodaj full-text indekse za pretraživanje

## 👤 Korisničke funkcionalnosti

- [ ] Omiljeno/watchlist za trgovine i artikle
- [ ] Obavijesti o sniženjima s notifikacijama
- [ ] Unaprijedi listu za kupovinu (kategorije, masovno uređivanje)
- [ ] Notifikacije u aplikaciji i e-mailom

## 🎨 Dorada frontenda

- [ ] Postavi rutiranje (React Router)
- [ ] Premjesti stanje u Context ili Redux/Zustand
- [ ] Kreiraj ponovno iskoristive UI komponente
- [ ] Dodaj učitavanje i prikaz stanja pogrešaka
- [ ] Prilagodi izgled za mobilne uređaje
- [x] Implementiraj tamni način rada

## 🚀 Implementacija i nadzor

- [ ] Deployaj na Vercel/Heroku/AWS
- [ ] Konfiguriraj postavke za različita okruženja
- [ ] Dodaj osnovno nadziranje i logiranje
