# Mailotion Studio — Canevas d'emails

Une petite application web gratuite, sans compte Canva, conçue pour créer et présenter **des maquettes visuelles d'emails e-commerce** sur téléphone ou ordinateur.

## URL de l'application

Après activation de GitHub Pages : **https://ludodulac.github.io/Canevas-mailotion/**

Pour activer la publication dans le dépôt public : **Settings → Pages → Build and deployment → Deploy from a branch → main / (root) → Save**.

Sur Android Chrome, cliquer sur le menu **⋮ → Ajouter à l'écran d'accueil** / **Installer l'application**.

## Fonctionnalités
- Galerie de modèles et aperçu de l'email complet en direct.
- 3 modèles fictifs inclus : **Bienvenue SOLÉA**, **Panier abandonné AURA BOTANICS**, **Après-achat NOMA COFFEE**.
- Personnaliser le texte, l'objet, le logo textuel, les couleurs, le bouton, la promotion, les blocs produits et les images.
- Dupliquer les modèles pour préparer une variante par boutique. Les variantes sont sauvegardées automatiquement **en local** dans le navigateur.
- Importer une image JPG/PNG/WebP depuis son téléphone : elle est compressée puis sauvegardée dans la version locale.
- Exporter en **PNG** (email entier sans mockup), partager l'image depuis Android, exporter HTML et enregistrer en PDF (via la fonction d'impression).
- Export/import de ses créations privées dans un fichier JSON.
- Une fois la page chargée, les modèles et les images du dépôt peuvent être consultés hors ligne. L'export PNG utilise la librairie open source html2canvas via CDN et peut demander une connexion réseau au premier usage.

### Important : images, textes et données sensibles

Le dépôt est **public**. Les maquettes originales et images dans `assets/` sont publiques. **Ne pas y enregistrer de véritables données clients, photos sous licence non autorisée, emails privés ni informations confidentielles.**

Les brouillons personnels réalisés dans l'application sont enregistrés dans le `localStorage` du navigateur **sur cet appareil uniquement** ; une autre conversation ChatGPT ne pourra pas les lire directement dans GitHub. Pour conserver les modifications en changeant de téléphone : utiliser **Sauvegarder mes créations (JSON)**, puis **Restaurer une sauvegarde**.

Les coordonnées ou adresses affichées dans les maquettes de démonstration sont fictives. Le HTML exporté est un **prototype** à adapter à son outil emailing ; les images SVG et certains CSS avancés ne sont pas pris en charge par tous les clients mail. Les liens, contenus et mentions obligatoires devront être vérifiés avant tout envoi réel. L'application ne lance aucun emailing.

## Faire ajouter des canevas par une autre conversation ChatGPT

Le dossier `assets/` contient les images des modèles. Le fichier `templates.json` est le **catalogue public**.

Pour ajouter un modèle, une conversation connectée à GitHub peut :
1. Lire `templates.json` et ajouter un objet avec les mêmes champs et un `id` unique dans `templates[]`.
2. Ajouter un visuel original sous `assets/` (SVG de préférence, ou une image binaire correctement déposée), et référencer le chemin dans `heroImage` et éventuellement `productImage`.
3. Effectuer les commits sur la branche principale `main`, puis indiquer le nouveau modèle.
4. L'utilisateur clique sur **Actualiser depuis GitHub** ; le canevas s'affiche automatiquement, et les brouillons privés restent inchangés.

**Exemple de demande :**

> Dans mon dépôt `ludodulac/Canevas-mailotion`, crée un nouveau canevas d'email « Panier abandonné — boutique de bijoux », avec un visuel original dans `assets/`. Ajoute-le à `templates.json` sans effacer les autres. Garde tous les champs modifiables par l'application. Pas de coordonnées personnelles ni d'images sans licence. Indique-moi quand c'est fait.

## Structure du dépôt

- `index.html` : interface
- `style.css` : identité visuelle Mailotion
- `app.js` : éditeur / exports / galerie
- `templates.json` : **catalogue des modèles que ChatGPT peut compléter**
- `assets/*` : images des emails que ChatGPT peut ajouter
- `sw.js` + `manifest.webmanifest` : accès mobile et hors ligne

## Particularités

- Il n'y a **pas** de serveur payant, de base de données ni de connexion à Canva.
- Les modèles exemples sont conçus comme des présentations, pas des campagnes prêtes à expédier.
- La fonction PNG utilise **html2canvas 1.4.1** (librairie MIT) depuis Cloudflare CDN. Si ce script est bloqué, les autres fonctions restent disponibles et le navigateur peut toujours réaliser une capture d'écran de l'aperçu.
