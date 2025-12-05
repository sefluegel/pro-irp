// src/pages/Calendar.jsx - Professional calendar with Google Calendar integration
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import {
  Calendar as CalendarIcon,
  Plus,
  X,
  Clock,
  MapPin,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

export default function Calendar() {
  const { t } = useTranslation();
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [availableCalendars, setAvailableCalendars] = useState([]);
  const [selectedCalendar, setSelectedCalendar] = useState(null);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);

  // Load Google Calendar events
  const loadGoogleEvents = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';

      const res = await fetch(`${BASE}/calendar/events`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.events) {
          const formattedEvents = data.events.map(event => ({
            id: event.id,
            title: event.summary || '(No title)',
            start: new Date(event.start),
            end: new Date(event.end),
            description: event.description,
            location: event.location,
            source: event.provider || 'google',
            color: '#4285F4' // Google blue
          }));
          setEvents(formattedEvents);
          setGoogleConnected(true);
        }
      }
    } catch (error) {
      console.error('Error loading calendar events:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check Google Calendar connection status
  useEffect(() => {
    async function checkConnection() {
      try {
        const token = localStorage.getItem('token');
        const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';

        const res = await fetch(`${BASE}/calendar/integrations`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          const googleIntegration = data.integrations?.find(i => i.provider === 'google');
          if (googleIntegration) {
            setGoogleConnected(true);
            setSelectedCalendar(googleIntegration.calendar_id || 'primary');
            loadGoogleEvents();
            fetchAvailableCalendars();
          }
        }
      } catch (error) {
        console.error('Error checking calendar connection:', error);
      }
    }

    checkConnection();
  }, [loadGoogleEvents]);

  // Handle slot selection (for creating new events)
  const handleSelectSlot = ({ start, end }) => {
    setSelectedSlot({ start, end });
    setShowNewEvent(true);
  };

  // Handle event selection (for viewing/editing)
  const handleSelectEvent = (event) => {
    const startFormatted = format(event.start, 'PPpp');
    const endFormatted = format(event.end, 'PPpp');
    let message = `📅 ${event.title}\n\n⏰ ${startFormatted}\n     to ${endFormatted}`;

    if (event.location) message += `\n\n📍 ${event.location}`;
    if (event.description) message += `\n\n📝 ${event.description}`;
    if (event.source === 'google') message += `\n\n🔗 Source: Google Calendar`;

    alert(message);
  };

  // Connect to Google Calendar
  const connectGoogle = async () => {
    try {
      const token = localStorage.getItem('token');
      const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';

      const res = await fetch(`${BASE}/calendar/google/connect`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.authUrl) {
          window.location.href = data.authUrl;
        }
      }
    } catch (error) {
      console.error('Error connecting Google Calendar:', error);
      alert('Failed to connect Google Calendar');
    }
  };

  // Fetch available calendars
  const fetchAvailableCalendars = async () => {
    try {
      const token = localStorage.getItem('token');
      const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';

      console.log('Fetching available calendars...');
      const res = await fetch(`${BASE}/calendar/google/calendars`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Calendar list response status:', res.status);
      const data = await res.json();
      console.log('Calendar list data:', data);

      if (res.ok) {
        if (data.ok && data.calendars) {
          console.log('Found calendars:', data.calendars.length);
          setAvailableCalendars(data.calendars);
        } else {
          console.warn('No calendars in response:', data);
        }
      } else {
        console.error('Failed to fetch calendars:', data);
        if (res.status === 404) {
          alert('Google Calendar not connected. Please connect your Google Calendar first.');
        }
      }
    } catch (error) {
      console.error('Error fetching calendars:', error);
      alert('Failed to fetch calendars. Check console for details.');
    }
  };

  // Update selected calendar
  const updateSelectedCalendar = async (calendarId) => {
    try {
      const token = localStorage.getItem('token');
      const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';

      const res = await fetch(`${BASE}/calendar/integrations/google/calendar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ calendarId })
      });

      if (res.ok) {
        setSelectedCalendar(calendarId);
        setShowCalendarPicker(false);
        await loadGoogleEvents(); // Reload events from new calendar
        alert('✅ Calendar updated successfully!');
      }
    } catch (error) {
      console.error('Error updating calendar:', error);
      alert('Failed to update calendar');
    }
  };

  // Custom event styling
  const eventStyleGetter = (event) => {
    const style = {
      backgroundColor: event.color || '#FFB800',
      borderRadius: '6px',
      opacity: 0.9,
      color: 'white',
      border: 'none',
      display: 'block',
      fontSize: '13px',
      padding: '4px 8px',
      fontWeight: '500'
    };
    return { style };
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
              <CalendarIcon className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">{t('calendar')}</h1>
              <p className="text-slate-600">{t('manageAppointments')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {googleConnected && (
              <>
                <button
                  onClick={() => setShowCalendarPicker(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-sm"
                >
                  <CalendarIcon size={18} />
                  <span className="hidden md:inline">
                    {availableCalendars.find(c => c.id === selectedCalendar)?.summary || t('selectCalendar')}
                  </span>
                </button>
                <button
                  onClick={loadGoogleEvents}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                  <span className="hidden md:inline">{t('refresh')}</span>
                </button>
              </>
            )}

            {!googleConnected && (
              <button
                onClick={connectGoogle}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="hidden md:inline">{t('connectGoogleCalendar')}</span>
                <span className="md:hidden">{t('connect')}</span>
              </button>
            )}

            <button
              onClick={() => setShowNewEvent(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition shadow-md font-semibold"
            >
              <Plus size={20} />
              <span className="hidden md:inline">{t('newEvent')}</span>
            </button>
          </div>
        </div>

        {/* Connection Status */}
        {googleConnected ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-green-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">{t('googleCalendarConnected')}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
            <AlertCircle size={18} />
            <span className="text-sm font-medium">{t('connectCalendarToSync')}</span>
          </div>
        )}
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-6">
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 600 }}
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
            eventPropGetter={eventStyleGetter}
            views={['month', 'week', 'day', 'agenda']}
            className="custom-calendar"
            popup
          />
        </div>
      </div>

      {/* New Event Modal */}
      {showNewEvent && (
        <NewEventModal
          selectedSlot={selectedSlot}
          onClose={() => {
            setShowNewEvent(false);
            setSelectedSlot(null);
          }}
          reloadEvents={loadGoogleEvents}
          googleConnected={googleConnected}
          t={t}
        />
      )}

      {/* Calendar Picker Modal */}
      {showCalendarPicker && (
        <CalendarPickerModal
          calendars={availableCalendars}
          selectedCalendar={selectedCalendar}
          onSelect={updateSelectedCalendar}
          onClose={() => setShowCalendarPicker(false)}
          t={t}
        />
      )}

      {/* Custom Calendar Styles */}
      <style>{`
        .custom-calendar .rbc-month-view,
        .custom-calendar .rbc-time-view,
        .custom-calendar .rbc-agenda-view {
          border: none;
        }

        .custom-calendar .rbc-header {
          padding: 12px 8px;
          font-weight: 600;
          color: #1e293b;
          background: #f8fafc;
          border-bottom: 2px solid #e2e8f0;
        }

        .custom-calendar .rbc-today {
          background-color: #fffbeb;
        }

        .custom-calendar .rbc-event {
          font-weight: 500;
        }

        .custom-calendar .rbc-toolbar button {
          color: #475569;
          border: 1px solid #e2e8f0;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 500;
        }

        .custom-calendar .rbc-toolbar button:hover {
          background-color: #f1f5f9;
        }

        .custom-calendar .rbc-toolbar button.rbc-active {
          background-color: #FFB800;
          color: white;
          border-color: #FFB800;
        }

        .custom-calendar .rbc-off-range-bg {
          background: #f8fafc;
        }

        .custom-calendar .rbc-date-cell {
          padding: 8px;
        }

        .custom-calendar .rbc-event-label {
          display: none;
        }

        .custom-calendar .rbc-toolbar {
          margin-bottom: 20px;
        }
      `}</style>
    </div>
  );
}

// New Event Modal Component
function NewEventModal({ selectedSlot, onClose, reloadEvents, googleConnected, t }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    start: selectedSlot?.start || new Date(),
    end: selectedSlot?.end || addHours(selectedSlot?.start || new Date(), 1),
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!googleConnected) {
      alert('Please connect your Google Calendar first to create events.');
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';

      const res = await fetch(`${BASE}/calendar/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          provider: 'google',
          summary: form.title,
          description: form.description,
          location: form.location,
          start: form.start.toISOString(),
          end: form.end.toISOString()
        })
      });

      if (res.ok) {
        alert('✅ Event created successfully!');
        await reloadEvents();
        onClose();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create event');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-slate-800">{t('newEvent')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {t('eventTitle')} *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              placeholder={t('eventTitlePlaceholder')}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <Clock size={16} className="inline mr-1" />
                {t('start')}
              </label>
              <input
                type="datetime-local"
                value={format(form.start, "yyyy-MM-dd'T'HH:mm")}
                onChange={(e) => setForm({ ...form, start: new Date(e.target.value) })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <Clock size={16} className="inline mr-1" />
                {t('end')}
              </label>
              <input
                type="datetime-local"
                value={format(form.end, "yyyy-MM-dd'T'HH:mm")}
                onChange={(e) => setForm({ ...form, end: new Date(e.target.value) })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <MapPin size={16} className="inline mr-1" />
              {t('location')}
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              placeholder={t('locationPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {t('description')}
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              rows="3"
              placeholder={t('descriptionPlaceholder')}
            />
          </div>

          {!googleConnected && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
              <AlertCircle size={16} className="inline mr-1" />
              {t('connectGoogleToCreate')}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-semibold"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || !googleConnected}
              className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? t('creating') : t('createEvent')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Calendar Picker Modal Component
function CalendarPickerModal({ calendars, selectedCalendar, onSelect, onClose, t }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-slate-800">{t('selectCalendarToSync')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 max-h-96 overflow-y-auto">
          <p className="text-sm text-slate-600 mb-4">
            {t('chooseCalendarToSync')}
          </p>

          <div className="space-y-2">
            {calendars.map((calendar) => (
              <button
                key={calendar.id}
                onClick={() => onSelect(calendar.id)}
                className={`w-full text-left p-4 rounded-lg border-2 transition ${
                  selectedCalendar === calendar.id
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: calendar.backgroundColor || '#4285F4' }}
                    />
                    <div>
                      <div className="font-semibold text-slate-800">
                        {calendar.summary}
                        {calendar.primary && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {t('primary')}
                          </span>
                        )}
                      </div>
                      {calendar.description && (
                        <div className="text-sm text-slate-500 mt-0.5">{calendar.description}</div>
                      )}
                      <div className="text-xs text-slate-400 mt-1">
                        {t('access')}: {calendar.accessRole}
                      </div>
                    </div>
                  </div>

                  {selectedCalendar === calendar.id && (
                    <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-semibold"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
