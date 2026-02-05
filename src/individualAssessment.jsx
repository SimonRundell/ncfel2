import {useState, useEffect} from 'react'
import axios from 'axios'
import { normalizeListResponse } from './adminApiHelpers'

function IndividualAssessment({id, config, notifyError}) {
    const [assessment, setAssessment] = useState([])
    const [selectedAssessment, setSelectedAssessment] = useState(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [questions, setQuestions] = useState([])
    const [answers, setAnswers] = useState({})
    const [loading, setLoading] = useState(false)


useEffect(() => {
    const getAssessmentsForStudent = async(studentId) => {
        const jsonData={
            studentId : studentId
        }

        // console.log("Sending ", jsonData)

        try {
            const response = await axios.post(
                `${config.api}/getAssessments.php`,
                jsonData ,
                {
                    headers: { 'Content-Type': 'application/json' },
                }
            );
            // console.log("Assessment for: ",studentId,  response.data)
            const assessmentData = normalizeListResponse(response.data);
            setAssessment(assessmentData);
        } catch (error) {
            console.error('Error loading Assessments:', error);
            notifyError('Error loading Assessments');
        }
    }
    
    if (id) {
        getAssessmentsForStudent(id);
    }
}, [id, config])

    const handleAssessmentClick = async (ass) => {
        setSelectedAssessment(ass)
        setModalOpen(true)
        setLoading(true)
        
        try {
            // Fetch questions and answers in parallel
            const [questionsResponse, answersResponse] = await Promise.all([
                axios.post(
                    `${config.api}/getQuestions.php`,
                    { unitId: ass.unitId, courseId: ass.courseId },
                    { headers: { 'Content-Type': 'application/json' } }
                ),
                axios.post(
                    `${config.api}/getAnswers.php`,
                    { activityId: ass.id, studentId: id },
                    { headers: { 'Content-Type': 'application/json' } }
                )
            ])
            
            const questionsList = normalizeListResponse(questionsResponse.data)
            const answersData = answersResponse.data?.data || {}
            
            setQuestions(Array.isArray(questionsList) ? questionsList : [])
            setAnswers(answersData.outcomes || {})
        } catch (error) {
            console.error('Error loading assessment details:', error)
            notifyError('Error loading assessment details')
        } finally {
            setLoading(false)
        }
    }

    const closeModal = () => {
        setModalOpen(false)
        setSelectedAssessment(null)
        setQuestions([])
        setAnswers({})
    }


    return (
        <>
        <div className="assessment-tags">
            {assessment.map((ass, index) => (
                <span 
                    className="assessment-tag" 
                    key={ass.id || index}
                    onClick={() => handleAssessmentClick(ass)}
                    style={{ cursor: 'pointer' }}
                >
                    {ass.courseName} | {ass.unitName} <span className="red">{ass.status}</span>
                </span>
            ))}
        </div>

        {modalOpen && (
            <div className="modal-backdrop" onClick={closeModal}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <div>
                            <div className="modal-title">
                                {selectedAssessment?.courseName} - {selectedAssessment?.unitName}
                            </div>
                            <div className="modal-subtitle">
                                Status: {selectedAssessment?.status}
                            </div>
                        </div>
                        <button onClick={closeModal}>Close</button>
                    </div>

                    <div className="modal-body">
                        {loading ? (
                            <div>Loading...</div>
                        ) : (
                            <table className="report-table" style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        {questions.map((question) => (
                                            <th key={question.id} style={{ textAlign: 'center', minWidth: '60px' }}>
                                                {question.QuestionRef}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        {questions.map((question) => {
                                            const outcome = answers[question.id]
                                            const achieved = outcome === 'achieved' || outcome === 'ACHIEVED'
                                            
                                            return (
                                                <td key={question.id} style={{ textAlign: 'center', fontSize: '1.5em', padding: '1rem' }}>
                                                    {outcome ? (achieved ? '✓' : '✗') : '-'}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        )}
        </>
    )
}

export default IndividualAssessment;