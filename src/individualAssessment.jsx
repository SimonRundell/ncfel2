import {useState, useEffect} from 'react'
import axios from 'axios'
import { normalizeListResponse } from './adminApiHelpers'

function IndividualAssessment({id, config, notifyError, studentName}) {
    const [assessment, setAssessment] = useState([])
    const [selectedAssessment, setSelectedAssessment] = useState(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [questions, setQuestions] = useState([])
    const [answers, setAnswers] = useState({})
    const [loading, setLoading] = useState(false)
    const [assessorName, setAssessorName] = useState('')


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
            
            // Fetch assessor name if assessorId is available
            if (ass.assessorId) {
                try {
                    const userResponse = await axios.post(
                        `${config.api}/getUsers.php`,
                        { id: ass.assessorId },
                        { headers: { 'Content-Type': 'application/json' } }
                    )
                    const users = normalizeListResponse(userResponse.data)
                    if (users.length > 0) {
                        setAssessorName(users[0].userName || '')
                    }
                } catch (err) {
                    console.error('Error fetching assessor:', err)
                }
            }
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
        setAssessorName('')
    }

    const getAchievedStatus = (status) => {
        if (status === 'PASSED' || status === 'COMPLETE') return 'ACHIEVED'
        return 'NOT YET ACHIEVED'
    }

    const handlePrint = () => {
        const printWindow = window.open('', '_blank')
        const reportContent = generateReportHTML()
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Assessor Feedback - ${studentName}</title>
                <style>
                    body {
                        margin: 0;
                        padding: 20px;
                        font-family: Arial, sans-serif;
                        background: white;
                        color: black;
                    }
                    table {
                        width: 100%;
                        border: 2px solid black;
                        border-collapse: collapse;
                    }
                    td, th {
                        border: 1px solid black;
                        padding: 0.5rem;
                    }
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        margin-bottom: 1rem;
                    }
                    .exeter {
                        font-size: 1.2rem;
                        color: #0066cc;
                        font-weight: bold;
                    }
                    h2 {
                        font-size: 1.5rem;
                        margin: 1rem 0;
                    }
                    .legend {
                        display: flex;
                        gap: 1rem;
                        font-size: 0.9rem;
                        margin-top: 0.5rem;
                    }
                    .legend-item {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                    }
                    .legend-box {
                        width: 30px;
                        height: 20px;
                        border: 1px solid black;
                    }
                    .achieved { background-color: #90EE90; }
                    .working { background-color: #FFB6C1; }
                    .not-submitted { background-color: #FFFFFF; }
                    .signature {
                        font-family: 'Brush Script MT', cursive;
                        font-size: 1.5rem;
                    }
                    @media print {
                        body { padding: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                ${reportContent}
                <div class="no-print" style="margin-top: 1rem; text-align: center;">
                    <button onclick="window.print()" style="padding: 0.75rem 1.5rem; margin-right: 0.5rem;">Print</button>
                    <button onclick="window.close()" style="padding: 0.75rem 1.5rem;">Close</button>
                </div>
            </body>
            </html>
        `)
        printWindow.document.close()
    }

    const generateReportHTML = () => {
        const achievedStatus = getAchievedStatus(selectedAssessment?.status)
        
        let questionsHTML = questions.map(question => {
            const outcome = answers[question.id]
            const achieved = outcome === 'achieved' || outcome === 'ACHIEVED'
            const bgClass = outcome ? (achieved ? 'achieved' : 'working') : 'not-submitted'
            const symbol = outcome ? (achieved ? '✓' : '✗') : '-'
            
            return `<th style="text-align: center; min-width: 50px;">${question.QuestionRef}</th>`
        }).join('')
        
        let answersHTML = questions.map(question => {
            const outcome = answers[question.id]
            const achieved = outcome === 'achieved' || outcome === 'ACHIEVED'
            const bgClass = outcome ? (achieved ? 'achieved' : 'working') : 'not-submitted'
            const symbol = outcome ? (achieved ? '✓' : '✗') : '-'
            
            return `<td class="${bgClass}" style="text-align: center; font-size: 1.2em; padding: 0.75rem;">${symbol}</td>`
        }).join('')
        
        return `
            <div class="header">
                <img src="/images/ncfe_bw.png" alt="NCFE" style="height: 60px;" />
                <div class="exeter">exeter college</div>
            </div>
            
            <h2>Assessor Feedback to Learner</h2>
            
            <table>
                <tbody>
                    <tr>
                        <td style="font-weight: bold; width: 15%;">Learner</td>
                        <td style="width: 35%;">${studentName || ''}</td>
                        <td style="font-weight: bold; width: 15%;">Assessor</td>
                        <td style="width: 35%;">${assessorName}</td>
                    </tr>
                    <tr>
                        <td colspan="4" style="font-weight: bold;">Qualification No & Name</td>
                    </tr>
                    <tr>
                        <td colspan="4">NCFE Level 2 ${selectedAssessment?.courseName || ''}</td>
                    </tr>
                    <tr>
                        <td colspan="4" style="font-weight: bold;">Unit / piece of evidence</td>
                    </tr>
                    <tr>
                        <td colspan="4">${selectedAssessment?.unitName || ''}</td>
                    </tr>
                    <tr>
                        <td colspan="4"><strong>Please list the units, learning outcomes and assessment criteria which were achieved</strong></td>
                    </tr>
                    <tr>
                        <td colspan="4"><strong>Assessment Criteria:</strong></td>
                    </tr>
                    <tr>
                        <td colspan="4" style="padding: 1rem;">
                            <table style="width: 100%; margin-bottom: 1rem;">
                                <thead>
                                    <tr>${questionsHTML}</tr>
                                </thead>
                                <tbody>
                                    <tr>${answersHTML}</tr>
                                </tbody>
                            </table>
                            <div class="legend">
                                <div class="legend-item">
                                    <div class="legend-box achieved"></div>
                                    <span>Achieved</span>
                                </div>
                                <div class="legend-item">
                                    <div class="legend-box working"></div>
                                    <span>Working towards</span>
                                </div>
                                <div class="legend-item">
                                    <div class="legend-box not-submitted"></div>
                                    <span>Not submitted</span>
                                </div>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="4" style="font-weight: bold;">Feedback from Assessor to Learner</td>
                    </tr>
                    <tr>
                        <td colspan="4" style="padding: 1rem; min-height: 100px; vertical-align: top;">
                            ${selectedAssessment?.assessorComment || ''}
                        </td>
                    </tr>
                    <tr>
                        <td colspan="4">
                            <strong>Has the learner achieved or not yet achieved?</strong> 
                            <span style="margin-left: 1rem;">${achievedStatus}</span>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="4" style="font-weight: bold;">Feedback from Learner</td>
                    </tr>
                    <tr>
                        <td colspan="4" style="padding: 1rem; min-height: 80px; vertical-align: top;"></td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold;">Learner Signature</td>
                        <td style="min-height: 40px;"></td>
                        <td style="font-weight: bold;">Date</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold;">Assessor Signature</td>
                        <td class="signature">${assessorName}</td>
                        <td style="font-weight: bold;">Date</td>
                        <td>${selectedAssessment?.dateMarked ? new Date(selectedAssessment.dateMarked).toLocaleDateString() : ''}</td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold;">IV Name</td>
                        <td colspan="3" style="min-height: 40px;"></td>
                    </tr>
                    <tr>
                        <td style="font-weight: bold;">IV Signature</td>
                        <td style="min-height: 40px;"></td>
                        <td style="font-weight: bold;">Date</td>
                        <td></td>
                    </tr>
                </tbody>
            </table>
        `
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
                <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', background: 'white', color: 'black' }}>
                    <div className="modal-header" style={{ borderBottom: 'none', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
                            <img src="/images/ncfe_bw.png" alt="NCFE" style={{ height: '60px' }} />
                            <div style={{ fontSize: '1.2rem', color: '#0066cc', fontWeight: 'bold' }}>
                                exeter college
                            </div>
                        </div>
                    </div>

                    <div className="modal-body" style={{ padding: '0 1.5rem 1.5rem' }}>
                        {loading ? (
                            <div style={{ color: 'black' }}>Loading...</div>
                        ) : (
                            <>
                                <h2 style={{ fontSize: '1.5rem', margin: '1rem 0', color: 'black' }}>Assessor Feedback to Learner</h2>
                                
                                <table style={{ width: '100%', border: '2px solid black', borderCollapse: 'collapse', color: 'black' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ border: '1px solid black', padding: '0.5rem', fontWeight: 'bold', width: '15%' }}>Learner</td>
                                            <td style={{ border: '1px solid black', padding: '0.5rem', width: '35%' }}>{studentName || ''}</td>
                                            <td style={{ border: '1px solid black', padding: '0.5rem', fontWeight: 'bold', width: '15%' }}>Assessor</td>
                                            <td style={{ border: '1px solid black', padding: '0.5rem', width: '35%' }}>{assessorName}</td>
                                        </tr>
                                        <tr>
                                            <td colSpan="4" style={{ border: '1px solid black', padding: '0.5rem', fontWeight: 'bold' }}>
                                                Qualification No & Name
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colSpan="4" style={{ border: '1px solid black', padding: '0.5rem' }}>
                                                NCFE Level 2 {selectedAssessment?.courseName}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colSpan="4" style={{ border: '1px solid black', padding: '0.5rem', fontWeight: 'bold' }}>
                                                Unit / piece of evidence
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colSpan="4" style={{ border: '1px solid black', padding: '0.5rem' }}>
                                                {selectedAssessment?.unitName}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colSpan="4" style={{ border: '1px solid black', padding: '0.5rem' }}>
                                                <strong>Please list the units, learning outcomes and assessment criteria which were achieved</strong>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colSpan="4" style={{ border: '1px solid black', padding: '0.5rem' }}>
                                                <strong>Assessment Criteria:</strong>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colSpan="4" style={{ border: '1px solid black', padding: '1rem' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                                                    <thead>
                                                        <tr>
                                                            {questions.map((question) => (
                                                                <th key={question.id} style={{ border: '1px solid black', padding: '0.5rem', textAlign: 'center', minWidth: '50px' }}>
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
                                                                const bgColor = outcome ? (achieved ? '#90EE90' : '#FFB6C1') : '#FFFFFF'
                                                                
                                                                return (
                                                                    <td key={question.id} style={{ 
                                                                        border: '1px solid black', 
                                                                        textAlign: 'center', 
                                                                        fontSize: '1.2em', 
                                                                        padding: '0.75rem',
                                                                        backgroundColor: bgColor
                                                                    }}>
                                                                        {outcome ? (achieved ? '✓' : '✗') : '-'}
                                                                    </td>
                                                                )
                                                            })}
                                                        </tr>
                                                    </tbody>
                                                </table>
                                                
                                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <div style={{ width: '30px', height: '20px', backgroundColor: '#90EE90', border: '1px solid black' }}></div>
                                                        <span>Achieved</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <div style={{ width: '30px', height: '20px', backgroundColor: '#FFB6C1', border: '1px solid black' }}></div>
                                                        <span>Working towards</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <div style={{ width: '30px', height: '20px', backgroundColor: '#FFFFFF', border: '1px solid black' }}></div>
                                                        <span>Not submitted</span>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colSpan="4" style={{ border: '1px solid black', padding: '0.5rem', fontWeight: 'bold' }}>
                                                Feedback from Assessor to Learner
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colSpan="4" style={{ border: '1px solid black', padding: '1rem', minHeight: '100px', verticalAlign: 'top' }}>
                                                {selectedAssessment?.assessorComment || ''}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colSpan="4" style={{ border: '1px solid black', padding: '0.5rem' }}>
                                                <strong>Has the learner achieved or not yet achieved?</strong> <span style={{ marginLeft: '1rem' }}>{getAchievedStatus(selectedAssessment?.status)}</span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colSpan="4" style={{ border: '1px solid black', padding: '0.5rem', fontWeight: 'bold' }}>
                                                Feedback from Learner
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colSpan="4" style={{ border: '1px solid black', padding: '1rem', minHeight: '80px', verticalAlign: 'top' }}>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ border: '1px solid black', padding: '0.5rem', fontWeight: 'bold' }}>Learner Signature</td>
                                            <td style={{ border: '1px solid black', padding: '0.5rem', minHeight: '40px' }}></td>
                                            <td style={{ border: '1px solid black', padding: '0.5rem', fontWeight: 'bold' }}>Date</td>
                                            <td style={{ border: '1px solid black', padding: '0.5rem' }}></td>
                                        </tr>
                                        <tr>
                                            <td style={{ border: '1px solid black', padding: '0.5rem', fontWeight: 'bold' }}>Assessor Signature</td>
                                            <td style={{ border: '1px solid black', padding: '0.5rem', fontFamily: 'Brush Script MT, cursive', fontSize: '1.5rem' }}>
                                                {assessorName}
                                            </td>
                                            <td style={{ border: '1px solid black', padding: '0.5rem', fontWeight: 'bold' }}>Date</td>
                                            <td style={{ border: '1px solid black', padding: '0.5rem' }}>
                                                {selectedAssessment?.dateMarked ? new Date(selectedAssessment.dateMarked).toLocaleDateString() : ''}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ border: '1px solid black', padding: '0.5rem', fontWeight: 'bold' }}>IV Name</td>
                                            <td colSpan="3" style={{ border: '1px solid black', padding: '0.5rem', minHeight: '40px' }}></td>
                                        </tr>
                                        <tr>
                                            <td style={{ border: '1px solid black', padding: '0.5rem', fontWeight: 'bold' }}>IV Signature</td>
                                            <td style={{ border: '1px solid black', padding: '0.5rem', minHeight: '40px' }}></td>
                                            <td style={{ border: '1px solid black', padding: '0.5rem', fontWeight: 'bold' }}>Date</td>
                                            <td style={{ border: '1px solid black', padding: '0.5rem' }}></td>
                                        </tr>
                                    </tbody>
                                </table>
                                
                                <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }} className="no-print">
                                    <button onClick={handlePrint} style={{ padding: '0.75rem 1.5rem' }}>Print</button>
                                    <button onClick={closeModal} style={{ padding: '0.75rem 1.5rem' }}>Close</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        )}
        </>
    )
}

export default IndividualAssessment;