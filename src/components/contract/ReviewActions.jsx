/**
 * ReviewActions.jsx
 * 
 * Renders a sidebar panel containing action buttons and comments
 * to manage the document's review workflow per version.
 */
import { useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'

/**
 * ReviewActions Component
 * 
 * @param {Object} props
 * @param {string} props.workflowStatus - Current status string for display.
 * @param {Function} props.onSendForReview - Marks current version as in review.
 * @param {Function} props.onApprove - Marks current version as approved.
 * @param {Function} props.onRequestChanges - Marks current version as changes requested.
 * @param {Function} props.onReject - Marks current version as rejected.
 * @param {Array} props.reviewComments - Comments saved against current version.
 * @param {Function} props.onAddComment - Adds a review comment to current version.
 * @param {string|null} props.sentForReviewAt - Timestamp when sent for review.
 */
export default function ReviewActions({
    workflowStatus,
    onSendForReview,
    onApprove,
    onRequestChanges,
    onReject,
    reviewComments = [],
    onAddComment,
    sentForReviewAt = null,
}) {
    const { t } = useLanguage()
    const [commentText, setCommentText] = useState('')

    const handleAddComment = () => {
        if (!commentText.trim()) return
        onAddComment?.(commentText.trim())
        setCommentText('')
    }

    return (
        <div className="contract-panel">
            <h3>{t.clientReview}</h3>

            <p className="muted-text">
                {t.currentStatus}: {workflowStatus}
            </p>

            {sentForReviewAt ? (
                <p className="muted-text">
                    {t.sentForReviewAt || 'Sent for review'}: {new Date(sentForReviewAt).toLocaleString()}
                </p>
            ) : null}

            <div className="review-actions">
                <button
                    type="button"
                    onClick={onSendForReview}
                    className="primary-btn"
                >
                    {t.sendForReview}
                </button>

                <button
                    type="button"
                    onClick={onApprove}
                    className="success-btn"
                >
                    {t.accept}
                </button>

                <button
                    type="button"
                    onClick={onRequestChanges}
                    className="warning-btn"
                >
                    {t.requestChanges}
                </button>

                <button
                    type="button"
                    onClick={onReject}
                    className="danger-btn"
                >
                    {t.reject}
                </button>
            </div>

            <div className="review-comments-section">
                <h4>{t.comments || 'Comments'}</h4>

                <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={t.addReviewComment || 'Add review comment...'}
                    rows={4}
                />

                <button
                    type="button"
                    onClick={handleAddComment}
                    className="primary-btn"
                >
                    {t.addComment || 'Add Comment'}
                </button>

                <div className="review-comments-list">
                    {reviewComments.length === 0 ? (
                        <p className="muted-text">{t.noReviewComments || 'No review comments yet.'}</p>
                    ) : (
                        reviewComments.map((comment, index) => (
                            <div
                                key={`${comment.createdAt || 'comment'}-${index}`}
                                className="review-comment-item"
                            >
                                <p>{comment.text}</p>
                                <small>
                                    {comment.createdAt
                                        ? new Date(comment.createdAt).toLocaleString()
                                        : ''}
                                </small>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}