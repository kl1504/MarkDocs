'use client';
import { createContext, useContext, useEffect, useState } from 'react';

export const STRINGS = {
  en: {
    appName: 'Folio',
    protectedTitle: 'This workspace is password-protected.',
    adminPassword: 'Admin password',
    unlock: 'Unlock',
    incorrectPassword: 'Incorrect password.',
    newDocument: 'New document',
    noDocuments: 'No documents yet. Create your first one to start writing.',
    emptyState: 'Select a document on the left, or create a new one to start writing.',
    write: 'Write',
    settings: 'Settings',
    history: 'History',
    title: 'Title',
    markdown: 'Markdown',
    type: 'Type',
    documentation: 'Documentation',
    book: 'Book',
    price: 'Price (USD)',
    priceHelp: '0 keeps it free to read in full. Above 0 shows a Buy button and hides most of the content until purchase.',
    customDomain: 'Custom domain (optional)',
    domainHelp: "Point this domain's DNS to your deployment, then it will serve this page at its root.",
    export: 'Export',
    saveChanges: 'Save changes',
    saving: 'Saving…',
    published: 'Published',
    draft: 'Draft',
    delete: 'Delete',
    deleteTitle: 'Delete this document?',
    deleteBody: (t) => `"${t}" and its version history will be permanently deleted. This cannot be undone.`,
    cancel: 'Cancel',
    confirmDelete: 'Delete permanently',
    saved: 'Saved',
    couldNotReachApi: 'Could not reach the API. Is the server running?',
    publicLink: 'Public link',
    noVersions: 'No earlier versions yet. Saved edits are snapshotted automatically.',
    restore: 'Restore this version',
    preview: 'Preview',
    viewSite: 'View site',
    logOut: 'Lock workspace',
  },
  fr: {
    appName: 'Folio',
    protectedTitle: 'Cet espace de travail est protégé par un mot de passe.',
    adminPassword: 'Mot de passe administrateur',
    unlock: 'Déverrouiller',
    incorrectPassword: 'Mot de passe incorrect.',
    newDocument: 'Nouveau document',
    noDocuments: 'Aucun document pour le moment. Crée le premier pour commencer à écrire.',
    emptyState: 'Sélectionne un document à gauche, ou crées-en un nouveau pour commencer à écrire.',
    write: 'Écrire',
    settings: 'Réglages',
    history: 'Historique',
    title: 'Titre',
    markdown: 'Markdown',
    type: 'Type',
    documentation: 'Documentation',
    book: 'Livre',
    price: 'Prix (USD)',
    priceHelp: "0 laisse le contenu gratuit et entier. Au-dessus de 0, un bouton d'achat apparaît et la majorité du contenu est masquée avant l'achat.",
    customDomain: 'Domaine personnalisé (optionnel)',
    domainHelp: 'Pointe le DNS de ce domaine vers ton déploiement pour que cette page s\'affiche à sa racine.',
    export: 'Exporter',
    saveChanges: 'Enregistrer',
    saving: 'Enregistrement…',
    published: 'Publié',
    draft: 'Brouillon',
    delete: 'Supprimer',
    deleteTitle: 'Supprimer ce document ?',
    deleteBody: (t) => `« ${t} » et son historique de versions seront supprimés définitivement. Cette action est irréversible.`,
    cancel: 'Annuler',
    confirmDelete: 'Supprimer définitivement',
    saved: 'Enregistré',
    couldNotReachApi: "Impossible de joindre l'API. Le serveur est-il lancé ?",
    publicLink: 'Lien public',
    noVersions: "Pas encore de version antérieure. Chaque enregistrement crée une sauvegarde automatique.",
    restore: 'Restaurer cette version',
    preview: 'Aperçu',
    viewSite: 'Voir le site',
    logOut: "Verrouiller l'espace",
  },
};

const LanguageContext = createContext({ lang: 'en', t: (k) => k, toggle: () => {} });

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en');

  useEffect(() => {
    const saved = localStorage.getItem('folio_lang');
    if (saved === 'fr' || saved === 'en') setLang(saved);
    else if (navigator.language?.toLowerCase().startsWith('fr')) setLang('fr');
  }, []);

  const set = (l) => { setLang(l); localStorage.setItem('folio_lang', l); };
  const toggle = () => set(lang === 'en' ? 'fr' : 'en');
  const t = (key, ...args) => {
    const v = STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
    return typeof v === 'function' ? v(...args) : v;
  };

  return <LanguageContext.Provider value={{ lang, t, toggle, setLang: set }}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
