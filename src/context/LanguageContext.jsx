import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { translations } from '../utils/translations'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
    const [language, setLanguage] = useState(() => {
        return localStorage.getItem('app_language') || 'en'
    })

    useEffect(() => {
        localStorage.setItem('app_language', language)
    }, [language])

    const value = useMemo(() => {
        return {
            language,
            setLanguage,
            t: translations[language] || translations.en,
        }
    }, [language])

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = useContext(LanguageContext)

    if (!context) {
        throw new Error('useLanguage must be used inside LanguageProvider')
    }

    return context
}