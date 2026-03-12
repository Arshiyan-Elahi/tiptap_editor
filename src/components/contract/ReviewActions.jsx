import { useLanguage } from '../../context/LanguageContext'

export default function ReviewActions({
    workflowStatus,
    setUnderReview,
    setAccepted,
    setChangesRequested,
    setRejected,
}) {
    const { t } = useLanguage()

    return (
        <div className="contract-panel">
            <h3>{t.clientReview}</h3>

            <p className="muted-text">
                {t.currentStatus}: {workflowStatus}
            </p>

            <div className="review-actions">
                <button
                    type="button"
                    onClick={setUnderReview}
                    className="primary-btn"
                >
                    {t.sendForReview}
                </button>

                <button
                    type="button"
                    onClick={setAccepted}
                    className="success-btn"
                >
                    {t.accept}
                </button>

                <button
                    type="button"
                    onClick={setChangesRequested}
                    className="warning-btn"
                >
                    {t.requestChanges}
                </button>

                <button
                    type="button"
                    onClick={setRejected}
                    className="danger-btn"
                >
                    {t.reject}
                </button>
            </div>
        </div>
    )
}