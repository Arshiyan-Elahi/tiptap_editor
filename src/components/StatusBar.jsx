import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const StatusBar = ({
    wordCount,
    charCount = 0,
    blockCount = 0,
    lastSaved,
    isSaving,
    profile = "contract",
    onProfileChange,
}) => {
    const { language, setLanguage, t } = useLanguage();

    return (
        <div className="status-bar">
            <div className="status-left">
                <span className="word-count">
                    {wordCount} {t.words} | {charCount} {t.characters} | {blockCount} {t.blocks}
                </span>
            </div>

            <div className="status-center">
                <select
                    value={profile}
                    onChange={(e) => onProfileChange(e.target.value)}
                    className="version-select profile-select-status"
                >
                    <option value="contract">{t.profileContract}</option>
                    <option value="sop">{t.profileSop}</option>
                </select>

                <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="version-select profile-select-status"
                >
                    <option value="en">{t.english}</option>
                    <option value="de">{t.german}</option>
                </select>
            </div>

            <div className="status-right">
                {isSaving ? (
                    <span className="saving-indicator">{t.saving}</span>
                ) : (
                    <span className="last-saved">
                        {t.saved} {lastSaved ? lastSaved.toLocaleTimeString() : t.never}
                    </span>
                )}
            </div>
        </div>
    );
};

export default StatusBar;