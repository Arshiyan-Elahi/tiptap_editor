export const StatusBar = ({ wordCount, lastSaved, isSaving, profile = 'Contract' }) => (
    <div className="status-bar">
        <div className="status-left">
            <span className="word-count">{wordCount} words</span>
        </div>
        <div className="status-right">
            {isSaving ? (
                <span className="saving-indicator">⏳ Saving...</span>
            ) : (
                <span className="last-saved">
                    Last saved: {lastSaved ? new Date(lastSaved).toLocaleTimeString() : 'Never'}
                </span>
            )}
            <span className={`profile-badge profile-${profile.toLowerCase()}`}>
                {profile}
            </span>
        </div>
    </div>
);
