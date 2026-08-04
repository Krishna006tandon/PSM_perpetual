import React, { useState, useEffect, useRef } from 'react';
import StudyLayout from '../components/StudyLayout';
import './MomWorksheet.css';

const MomWorksheet = ({ study, onBack, onNavigate, theme, toggleTheme, canEdit, onUpdate }) => {
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [momData, setMomData] = useState({});
  const [teamMembers, setTeamMembers] = useState([]);
  const editorRef = useRef(null);
  const pdfExportRef = useRef(null);

  useEffect(() => {
    if (study) {
      setDates(study.meetingDates || []);
      if (study.meetingDates && study.meetingDates.length > 0) {
        setSelectedDate(study.meetingDates[study.meetingDates.length - 1]); // default to latest
      }
      if (study.momData) {
        setMomData(study.momData);
      }
      
      const fetchMembers = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`http://localhost:5000/api/teams/${study._id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setTeamMembers(data);
          }
        } catch (err) {
          console.error(err);
        }
      };
      fetchMembers();
    }
  }, [study]);

  useEffect(() => {
    if (selectedDate && editorRef.current) {
      // Check if current date has MOM
      if (momData[selectedDate]) {
        editorRef.current.innerHTML = momData[selectedDate];
      } else {
        // Auto-suggestion: check previous date
        const currentIndex = dates.indexOf(selectedDate);
        if (currentIndex > 0) {
          const previousDate = dates[currentIndex - 1];
          if (momData[previousDate]) {
            editorRef.current.innerHTML = `<div><em>[Carried over from ${previousDate}]</em></div><br/>` + momData[previousDate];
            handleSave(); // Auto-save this suggestion
          } else {
            editorRef.current.innerHTML = '';
          }
        } else {
          editorRef.current.innerHTML = '';
        }
      }
    }
  }, [selectedDate, momData, dates]);

  const execCmd = (command) => {
    document.execCommand(command, false, null);
    editorRef.current.focus();
    handleSave();
  };

  const handleSave = async () => {
    if (!canEdit || !selectedDate || !editorRef.current) return;
    const content = editorRef.current.innerHTML;
    const updatedMomData = { ...momData, [selectedDate]: content };
    setMomData(updatedMomData);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/studies/${study._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ momData: updatedMomData })
      });
      if (res.ok && onUpdate) {
        const updatedStudy = await res.json();
        onUpdate(updatedStudy);
      }
    } catch (err) {
      console.error('Failed to save MOM:', err);
    }
  };

  const exportToPDF = () => {
    if (!window.html2canvas || !window.jspdf || !window.jspdf.jsPDF) {
      alert("PDF libraries are loading. Please try again in a second.");
      return;
    }
    
    const generatePDF = async (logoImg) => {
      const doc = new window.jspdf.jsPDF('p', 'pt', 'a4');
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      // 1. Draw Top Colored Banner (Deep Teal)
      doc.setFillColor(13, 116, 124); // #0D747C Deep Teal
      doc.rect(0, 0, pageWidth, 90, 'F'); // Top banner
      
      // 2. Draw Logo and Title inside Banner
      if (logoImg) {
        // Keeping logo slightly left of center
        doc.addImage(logoImg, 'PNG', 40, 20, 100, 50);
      }
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255); // White text
      doc.text("MINUTES OF MEETING", pageWidth / 2 + 30, 55, { align: 'center' });

      // 3. Draw Metadata Block
      let currentY = 120;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(55, 65, 81); // Dark Gray text
      
      doc.text(`Project Name:`, 40, currentY);
      doc.setFont("helvetica", "normal");
      doc.text(`${study?.studyName || 'N/A'}`, 120, currentY);
      
      currentY += 20;
      doc.setFont("helvetica", "bold");
      doc.text(`Date:`, 40, currentY);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedDate}`, 120, currentY);

      currentY += 20;
      doc.setFont("helvetica", "bold");
      doc.text(`Location:`, 40, currentY);
      doc.setFont("helvetica", "normal");
      doc.text(`${study?.facility || 'N/A'}`, 120, currentY);

      currentY += 20;
      doc.setFont("helvetica", "bold");
      doc.text(`Attendees:`, 40, currentY);
      doc.setFont("helvetica", "normal");
      
      // Calculate attendees present on selectedDate
      const attendees = teamMembers
        .filter(m => m.attendanceDates && m.attendanceDates[selectedDate])
        .map(m => m.fullName);
      const attendeeText = attendees.length > 0 ? attendees.join(', ') : 'No attendees marked present';
      
      // Handle word wrapping for attendees
      const splitAttendees = doc.splitTextToSize(attendeeText, pageWidth - 160);
      doc.text(splitAttendees, 120, currentY);
      
      currentY += (splitAttendees.length * 15) + 20; // Add space after attendees

      // 4. Render the Rich Text Content via html2canvas
      const element = pdfExportRef.current;
      if (!element) return;
      
      element.innerHTML = editorRef.current.innerHTML;
      element.style.left = '0';
      element.style.zIndex = '-1';
      
      try {
        const canvas = await window.html2canvas(element, { scale: 2, useCORS: true, logging: false });
        const imgData = canvas.toDataURL('image/png');
        
        // Add a nice border around the content area
        const contentWidth = pageWidth - 80;
        const contentHeight = (canvas.height * contentWidth) / canvas.width;
        
        // White content background
        doc.setFillColor(255, 255, 255);
        // Soft border and drop shadow simulation using rounded rect
        doc.setDrawColor(229, 231, 235); // Very light gray border
        doc.setLineWidth(1);
        doc.roundedRect(40, currentY, contentWidth, contentHeight, 5, 5, 'FD'); // Fill and Border, rounded corners
        
        doc.addImage(imgData, 'PNG', 40, currentY, contentWidth, contentHeight);
        
        // 5. Draw Footer (Deep Teal text)
        doc.setFontSize(10);
        doc.setTextColor(13, 116, 124);

        doc.text("www.perpetualsolutions.co.in", pageWidth / 2, pageHeight - 30, { align: 'center' });
        
        doc.save(`MOM_${study.studyName}_${selectedDate}.pdf`);
      } catch (err) {
        console.error("Export failed:", err);
      } finally {
        element.style.left = '-9999px';
      }
    };

    const img = new Image();
    img.src = '/logo.png';
    img.onload = () => generatePDF(img);
    img.onerror = () => generatePDF(null);
  };

  return (
    <StudyLayout activeTab="mom" onBack={onBack} onNavigate={onNavigate} theme={theme} toggleTheme={toggleTheme}>
      <div className="mom-container">
        {dates.length === 0 ? (
          <div className="mom-no-dates">
            <h3>No Meeting Dates Found</h3>
            <p>Please add meeting dates in the Team Members tab first to write Minutes of Meeting.</p>
          </div>
        ) : (
          <>
            <div className="mom-header">
              <h2>Minutes of Meeting (MOM)</h2>
              <div className="date-selector">
                <label style={{marginRight: '10px', fontWeight: '500'}}>Select Meeting Date:</label>
                <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
                  {dates.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rich-text-container">
              {canEdit && (
                <div className="rich-text-toolbar">
                  <button className="toolbar-btn" onClick={() => execCmd('bold')}><b>B</b></button>
                  <button className="toolbar-btn" onClick={() => execCmd('italic')}><i>I</i></button>
                  <button className="toolbar-btn" onClick={() => execCmd('underline')}><u>U</u></button>
                  <button className="toolbar-btn" onClick={() => execCmd('insertUnorderedList')}>• List</button>
                  <button className="toolbar-btn" onClick={() => execCmd('insertOrderedList')}>1. List</button>
                </div>
              )}
              <div 
                className="rich-text-editor" 
                ref={editorRef}
                contentEditable={canEdit}
                onBlur={handleSave}
                onInput={() => { /* optional typing state */ }}
                suppressContentEditableWarning={true}
              ></div>
            </div>

            <div className="mom-actions">
              <button className="btn-export" onClick={exportToPDF}>
                📥 Export PDF
              </button>
            </div>
          </>
        )}
      </div>

      {/* Hidden template for PDF export to perfectly match the user request */}
      <div 
        className="pdf-export-content" 
        ref={pdfExportRef}
        style={{
          position: 'absolute', left: '-9999px', top: 0,
          width: '700px', padding: '20px', boxSizing: 'border-box',
          backgroundColor: 'white', color: '#1f2937', fontSize: '15px', lineHeight: '1.6'
        }}
      >
        {/* Injected dynamically */}
      </div>
    </StudyLayout>
  );
};

export default MomWorksheet;
