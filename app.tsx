// ═══════════════════════════════════════════════════════════════
// ARMREIF SUNDIAL CONVERTER
// Premium neumorphic web app for Theresa
// ═══════════════════════════════════════════════════════════════

const { useState, useEffect, useRef } = React;

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
    // Location (adjust for Theresa's location)
    latitude: 48.1351,        // Munich, Germany (example)
    longitude: 11.5820,
    timezoneOffset: 1,        // CET = UTC+1
    
    // Reference date (bracelet calibration date)
    referenceDate: new Date('2025-06-21'), // Summer solstice
    
    // Bracelet image coordinates (natural image size)
    imageNaturalWidth: 2880,  // Adjust to actual Armreif.png size
    imageNaturalHeight: 1200,
    
    // Engraved number coordinates in image space
    braceletCoords: {
        14: { x: 908, y: 600 },
        15: { x: 747, y: 600 },
        16: { x: 573, y: 600 },
        17: { x: 405, y: 600 },
        21: { x: 2266, y: 600 },
        22: { x: 2112, y: 600 },
    }
};

// ═══════════════════════════════════════════════════════════════
// ASTRONOMICAL CALCULATIONS
// ═══════════════════════════════════════════════════════════════

class SundialCalculator {
    constructor(config) {
        this.lat = config.latitude;
        this.lon = config.longitude;
        this.tzOffset = config.timezoneOffset;
        this.refDate = config.referenceDate;
    }
    
    // Day of year (1-366)
    getDayOfYear(date) {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date - start;
        const oneDay = 1000 * 60 * 60 * 24;
        return Math.floor(diff / oneDay);
    }
    
    // Equation of Time in minutes
    equationOfTime(date) {
        const n = this.getDayOfYear(date);
        const B = (360 / 365.25) * (n - 81) * Math.PI / 180;
        const EoT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
        return EoT;
    }
    
    // Solar declination in degrees
    declination(date) {
        const n = this.getDayOfYear(date);
        const delta = 23.45 * Math.sin((360 / 365.25) * (n - 81) * Math.PI / 180);
        return delta;
    }
    
    // Convert time string "HH:MM" to decimal hours
    timeToDecimal(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours + minutes / 60;
    }
    
    // Convert decimal hours to "HH:MM" format
    decimalToTime(decimal) {
        const hours = Math.floor(decimal);
        const minutes = Math.round((decimal - hours) * 60);
        const h = hours % 24;
        const m = minutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    
    // Convert bracelet reading to true clock time for selected date
    convertBraceletTime(readTime, selectedDate) {
        try {
            const T_read = this.timeToDecimal(readTime);
            
            // Step 1: Convert to solar time on reference date
            const lambda_std = 15 * this.tzOffset;
            const EoT_d0 = this.equationOfTime(this.refDate);
            const T_solar_d0 = T_read + (4 * (this.lon - lambda_std) + EoT_d0) / 60;
            
            // Step 2: Compute hour angle on reference date
            const H0 = 15 * (T_solar_d0 - 12);
            
            // Step 3: Compute sun altitude on reference date
            const lat_rad = this.lat * Math.PI / 180;
            const delta_d0 = this.declination(this.refDate) * Math.PI / 180;
            const H0_rad = H0 * Math.PI / 180;
            
            const sin_h = Math.sin(lat_rad) * Math.sin(delta_d0) + 
                         Math.cos(lat_rad) * Math.cos(delta_d0) * Math.cos(H0_rad);
            const h_star = Math.asin(sin_h); // in radians
            
            // Step 4: For selected date, solve for hour angle with same altitude
            const delta_d = this.declination(selectedDate) * Math.PI / 180;
            
            const cos_H = (Math.sin(h_star) - Math.sin(lat_rad) * Math.sin(delta_d)) / 
                         (Math.cos(lat_rad) * Math.cos(delta_d));
            
            // Check domain validity
            if (cos_H < -1 || cos_H > 1) {
                return null; // No valid result
            }
            
            let H = Math.acos(cos_H) * 180 / Math.PI;
            
            // Choose sign based on AM/PM (before or after solar noon)
            if (T_read < 12) {
                H = -H; // Morning
            }
            
            // Step 5: Convert back to solar time on selected date
            const T_solar_d = 12 + H / 15;
            
            // Step 6: Convert solar to clock time
            const EoT_d = this.equationOfTime(selectedDate);
            const T_clock = T_solar_d - (4 * (this.lon - lambda_std) + EoT_d) / 60;
            
            // Step 7: Handle DST (simple check for European DST)
            const isDST = this.isDaylightSaving(selectedDate);
            const T_true = T_clock + (isDST ? 1 : 0);
            
            // Step 8: Compute correction
            const correction = (T_true - T_read) * 60; // in minutes
            
            return {
                trueTime: this.decimalToTime(T_true),
                correction: Math.round(correction),
                valid: true
            };
        } catch (error) {
            console.error('Calculation error:', error);
            return null;
        }
    }
    
    // Simple DST check for European rules (last Sunday of March/October)
    isDaylightSaving(date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        
        if (month < 2 || month > 9) return false; // Jan-Feb, Nov-Dec
        if (month > 2 && month < 9) return true;  // Apr-Sep
        
        // March or October - check last Sunday
        const lastSunday = new Date(year, month + 1, 0);
        lastSunday.setDate(lastSunday.getDate() - lastSunday.getDay());
        
        if (month === 2) { // March - DST starts
            return date >= lastSunday;
        } else { // October - DST ends
            return date < lastSunday;
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// BRACELET SLIDER COMPONENT
// ═══════════════════════════════════════════════════════════════

function BraceletSlider({ onTimeChange, imagePath }) {
    const [knobPosition, setKnobPosition] = useState(50); // percentage
    const [isDragging, setIsDragging] = useState(false);
    const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
    const containerRef = useRef(null);
    const imageRef = useRef(null);
    
    useEffect(() => {
        const updateSize = () => {
            if (imageRef.current) {
                const rect = imageRef.current.getBoundingClientRect();
                setDisplaySize({ width: rect.width, height: rect.height });
            }
        };
        
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);
    
    // Transform image coordinates to display coordinates
    const scaleX = displaySize.width / CONFIG.imageNaturalWidth;
    
    // Compute read time from knob position
    const computeReadTime = (positionPercent) => {
        const knobX = (positionPercent / 100) * CONFIG.imageNaturalWidth;
        
        // Define segments
        const segment1 = [
            { time: 17, x: CONFIG.braceletCoords[17].x },
            { time: 16, x: CONFIG.braceletCoords[16].x },
            { time: 15, x: CONFIG.braceletCoords[15].x },
            { time: 14, x: CONFIG.braceletCoords[14].x },
        ].sort((a, b) => a.x - b.x);
        
        const segment2 = [
            { time: 22, x: CONFIG.braceletCoords[22].x },
            { time: 21, x: CONFIG.braceletCoords[21].x },
        ].sort((a, b) => a.x - b.x);
        
        // Check which segment
        const inSegment1 = knobX >= segment1[0].x && knobX <= segment1[segment1.length - 1].x;
        const inSegment2 = knobX >= segment2[0].x && knobX <= segment2[segment2.length - 1].x;
        
        if (inSegment1) {
            return interpolateTime(segment1, knobX);
        } else if (inSegment2) {
            return interpolateTime(segment2, knobX);
        } else {
            return null; // In gap
        }
    };
    
    const interpolateTime = (segment, x) => {
        // Find bracketing points
        for (let i = 0; i < segment.length - 1; i++) {
            if (x >= segment[i].x && x <= segment[i + 1].x) {
                const t = (x - segment[i].x) / (segment[i + 1].x - segment[i].x);
                const timeDecimal = segment[i].time + t * (segment[i + 1].time - segment[i].time);
                const hours = Math.floor(timeDecimal);
                const minutes = Math.round((timeDecimal - hours) * 60);
                return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            }
        }
        return null;
    };
    
    useEffect(() => {
        const readTime = computeReadTime(knobPosition);
        onTimeChange(readTime);
    }, [knobPosition]);
    
    const handleMouseDown = (e) => {
        setIsDragging(true);
        updateKnobPosition(e.clientX);
    };
    
    const handleTouchStart = (e) => {
        setIsDragging(true);
        updateKnobPosition(e.touches[0].clientX);
    };
    
    const handleMouseMove = (e) => {
        if (isDragging) {
            updateKnobPosition(e.clientX);
        }
    };
    
    const handleTouchMove = (e) => {
        if (isDragging) {
            updateKnobPosition(e.touches[0].clientX);
        }
    };
    
    const handleEnd = () => {
        setIsDragging(false);
    };
    
    const updateKnobPosition = (clientX) => {
        if (!containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setKnobPosition(percent);
    };
    
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleEnd);
            window.addEventListener('touchmove', handleTouchMove);
            window.addEventListener('touchend', handleEnd);
            
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleEnd);
                window.removeEventListener('touchmove', handleTouchMove);
                window.removeEventListener('touchend', handleEnd);
            };
        }
    }, [isDragging, knobPosition]);
    
    const readTime = computeReadTime(knobPosition);
    
    return (
        <div className="bracelet-section fade-in">
            <div className="section-label">Armreif-Zeit ablesen</div>
            <div className="bracelet-container" ref={containerRef}>
                <img 
                    ref={imageRef}
                    src={imagePath} 
                    alt="Armreif" 
                    className="bracelet-image"
                    onLoad={() => {
                        const rect = imageRef.current.getBoundingClientRect();
                        setDisplaySize({ width: rect.width, height: rect.height });
                    }}
                />
                <div className="bracelet-slider-track">
                    <div 
                        className="bracelet-knob"
                        style={{ left: `${knobPosition}%` }}
                        onMouseDown={handleMouseDown}
                        onTouchStart={handleTouchStart}
                    >
                        <div className="bracelet-knob-inner"></div>
                    </div>
                </div>
            </div>
            {!readTime && (
                <div className="bracelet-hint">
                    Bewege den Regler auf eine gravierte Zeit
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════════

function App() {
    const [screen, setScreen] = useState('greeting'); // 'greeting' | 'converter'
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [braceletTime, setBraceletTime] = useState(null);
    const [result, setResult] = useState(null);
    const [showInfo, setShowInfo] = useState(false);
    
    const calculator = new SundialCalculator(CONFIG);
    
    useEffect(() => {
        if (braceletTime && selectedDate) {
            const res = calculator.convertBraceletTime(braceletTime, selectedDate);
            setResult(res);
        } else {
            setResult(null);
        }
    }, [braceletTime, selectedDate]);
    
    const formatDate = (date) => {
        return new Intl.DateTimeFormat('de-DE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(date);
    };
    
    const formatDateInput = (date) => {
        return date.toISOString().split('T')[0];
    };
    
    if (screen === 'greeting') {
        return (
            <div className="greeting-screen">
                <div className="greeting-hero fade-in">
                    <h1 className="greeting-title">Hallo Theresa</h1>
                    <p className="greeting-date">Heute ist der {formatDate(new Date())}</p>
                    <button 
                        className="greeting-cta"
                        onClick={() => setScreen('converter')}
                    >
                        Zeit umrechnen
                    </button>
                    <p className="greeting-hint">
                        Lies die Zeit am Armreif ab – ich mache den Rest.
                    </p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="converter-screen">
            <div className="converter-container">
                <div className="converter-header">
                    <h2 className="converter-title">Armreif-Rechner</h2>
                    <button 
                        className="back-button"
                        onClick={() => setScreen('greeting')}
                    >
                        ← Zurück
                    </button>
                </div>
                
                <BraceletSlider 
                    onTimeChange={setBraceletTime}
                    imagePath="Armreif.png"
                />
                
                <div className="date-section fade-in">
                    <div className="section-label">Datum wählen</div>
                    <div className="date-picker-wrapper">
                        <input 
                            type="date"
                            className="date-input"
                            value={formatDateInput(selectedDate)}
                            onChange={(e) => setSelectedDate(new Date(e.target.value + 'T12:00:00'))}
                        />
                    </div>
                </div>
                
                <div className="result-section fade-in">
                    {!braceletTime || !result ? (
                        <div className="result-empty">
                            Wähle eine Zeit am Armreif
                        </div>
                    ) : (
                        <div className="result-content">
                            <div className="result-row">
                                <div className="result-label">Armreif zeigt</div>
                                <div className="result-value">{braceletTime}</div>
                            </div>
                            
                            <div className="divider"></div>
                            
                            <div className="result-row">
                                <div className="result-label">Echte Uhrzeit</div>
                                <div className="result-value">{result.trueTime}</div>
                            </div>
                            
                            <div className="divider"></div>
                            
                            <div className="result-row">
                                <div className="result-label">Korrektur</div>
                                <div className={`result-correction ${result.correction >= 0 ? 'positive' : 'negative'}`}>
                                    {result.correction >= 0 ? '+' : ''}{result.correction} min
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="info-panel">
                    <button 
                        className="info-toggle"
                        onClick={() => setShowInfo(!showInfo)}
                    >
                        {showInfo ? '▼' : '▶'} Info
                    </button>
                    {showInfo && (
                        <div className="info-content fade-in">
                            Der Armreif funktioniert wie eine Sonnenuhr. Er wurde an einem 
                            Referenzdatum kalibriert. Durch die sich ändernde Sonnenbahn im 
                            Jahresverlauf muss die angezeigte Zeit korrigiert werden.
                            
                            <div className="info-detail">
                                Referenzdatum: {formatDate(CONFIG.referenceDate)}<br/>
                                Standort: {CONFIG.latitude.toFixed(2)}°N, {CONFIG.longitude.toFixed(2)}°E
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// RENDER APP
// ═══════════════════════════════════════════════════════════════

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
