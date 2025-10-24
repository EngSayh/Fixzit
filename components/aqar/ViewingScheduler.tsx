'use client';

import { useState } from 'react';
import { Calendar, Clock, Phone, Video, MapPin, CheckCircle } from 'lucide-react';

export interface ViewingSchedulerProps {
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  agentId: string;
  agentName: string;
  agentPhoto?: string;
  availableSlots?: { date: string; times: string[] }[];
  onSchedule?: (data: ViewingRequestData) => Promise<void>;
}

export interface ViewingRequestData {
  propertyId: string;
  agentId: string;
  preferredDate: Date;
  preferredTime: string;
  viewingType: 'IN_PERSON' | 'VIRTUAL' | 'VIDEO_CALL';
  participants: Array<{
    name: string;
    phone: string;
    relationship: string;
  }>;
  specialRequests?: string;
}

export default function ViewingScheduler({
  propertyId,
  propertyTitle,
  propertyAddress,
  agentId,
  agentName,
  agentPhoto: _agentPhoto, // Reserved for future use
  availableSlots: _availableSlots = [], // Reserved for future use
  onSchedule
}: ViewingSchedulerProps) {
  const [step, setStep] = useState<'type' | 'datetime' | 'details' | 'confirm' | 'success'>('type');
  const [viewingType, setViewingType] = useState<'IN_PERSON' | 'VIRTUAL' | 'VIDEO_CALL'>('IN_PERSON');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  // const [alternativeDates, setAlternativeDates] = useState<Date[]>([]); // Reserved for future multi-date selection
  const [participants, setParticipants] = useState([{ name: '', phone: '', relationship: 'Primary' }]);
  const [specialRequests, setSpecialRequests] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate next 14 days
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const availableDates = generateDates();

  // Time slots
  const morningSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];
  const afternoonSlots = ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];
  const eveningSlots = ['17:00', '17:30', '18:00', '18:30', '19:00'];

  // const allTimeSlots = [...morningSlots, ...afternoonSlots, ...eveningSlots]; // Available if needed for future features

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-SA', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(date);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const addParticipant = () => {
    setParticipants([...participants, { name: '', phone: '', relationship: 'Family' }]);
  };

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) return;

    setIsSubmitting(true);
    try {
      const data: ViewingRequestData = {
        propertyId,
        agentId,
        preferredDate: selectedDate,
        preferredTime: selectedTime,
        viewingType,
        participants: participants.filter((p) => p.name && p.phone),
        specialRequests: specialRequests || undefined,
      };

      if (onSchedule) {
        await onSchedule(data);
      }

      setStep('success');
    } catch (error) {
      console.error('Failed to schedule viewing:', error);
      alert('Failed to schedule viewing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Viewing Scheduled!</h2>
        <p className="text-gray-600 mb-6">
          Your viewing request has been sent to {agentName}. You will receive a confirmation shortly.
        </p>
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-gray-900 mb-3">Viewing Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700">{propertyTitle}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700">{selectedDate && formatDate(selectedDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700">{selectedTime}</span>
            </div>
            <div className="flex items-center gap-2">
              {viewingType === 'IN_PERSON' && <MapPin className="w-4 h-4 text-gray-500" />}
              {viewingType === 'VIDEO_CALL' && <Video className="w-4 h-4 text-gray-500" />}
              {viewingType === 'VIRTUAL' && <Phone className="w-4 h-4 text-gray-500" />}
              <span className="text-gray-700">
                {viewingType === 'IN_PERSON' && 'In-Person Viewing'}
                {viewingType === 'VIDEO_CALL' && 'Video Call'}
                {viewingType === 'VIRTUAL' && 'Virtual Tour'}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-gradient-to-r from-[#FFB400] to-[#FF8C00] text-white rounded-lg hover:shadow-lg transition-shadow"
        >
          Schedule Another Viewing
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Schedule a Viewing</h2>
        <p className="text-sm text-gray-600">{propertyTitle}</p>
        <p className="text-xs text-gray-500">{propertyAddress}</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {['Type', 'Date & Time', 'Details', 'Confirm'].map((label, idx) => {
          const stepKeys = ['type', 'datetime', 'details', 'confirm'];
          const currentIdx = stepKeys.indexOf(step);
          const isActive = idx === currentIdx;
          const isCompleted = idx < currentIdx;

          return (
            <div key={label} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                isCompleted ? 'bg-green-600' : isActive ? 'bg-[#FFB400]' : 'bg-gray-300'
              } text-white text-sm font-semibold`}>
                {isCompleted ? '✓' : idx + 1}
              </div>
              <span className={`ml-2 text-sm ${isActive ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                {label}
              </span>
              {idx < 3 && <div className={`flex-1 h-1 mx-2 ${isCompleted ? 'bg-green-600' : 'bg-gray-300'}`} />}
            </div>
          );
        })}
      </div>

      {/* Step 1: Viewing Type */}
      {step === 'type' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 mb-4">How would you like to view this property?</h3>
          
          <button
            onClick={() => setViewingType('IN_PERSON')}
            className={`w-full p-4 rounded-lg border-2 transition-colors text-left ${
              viewingType === 'IN_PERSON' ? 'border-[#FFB400] bg-orange-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <MapPin className="w-6 h-6 text-[#FF8C00] mt-1" />
              <div>
                <h4 className="font-semibold text-gray-900">In-Person Viewing</h4>
                <p className="text-sm text-gray-600">Visit the property with the agent</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setViewingType('VIDEO_CALL')}
            className={`w-full p-4 rounded-lg border-2 transition-colors text-left ${
              viewingType === 'VIDEO_CALL' ? 'border-[#FFB400] bg-orange-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <Video className="w-6 h-6 text-[#FF8C00] mt-1" />
              <div>
                <h4 className="font-semibold text-gray-900">Live Video Call</h4>
                <p className="text-sm text-gray-600">Virtual walkthrough with agent via video call</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setViewingType('VIRTUAL')}
            className={`w-full p-4 rounded-lg border-2 transition-colors text-left ${
              viewingType === 'VIRTUAL' ? 'border-[#FFB400] bg-orange-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <Phone className="w-6 h-6 text-[#FF8C00] mt-1" />
              <div>
                <h4 className="font-semibold text-gray-900">Virtual Tour</h4>
                <p className="text-sm text-gray-600">Self-guided 360° virtual tour</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setStep('datetime')}
            className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-[#FFB400] to-[#FF8C00] text-white rounded-lg hover:shadow-lg transition-shadow font-semibold"
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 2: Date & Time Selection */}
      {step === 'datetime' && (
        <div className="space-y-6">
          {/* Date Selection */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Select Date</h3>
            <div className="grid grid-cols-7 gap-2">
              {availableDates.map((date) => (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  className={`p-2 rounded-lg border text-center transition-colors ${
                    selectedDate && selectedDate.toDateString() === date.toDateString()
                      ? 'border-[#FFB400] bg-orange-50 text-gray-900'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="text-xs font-semibold">{date.toLocaleDateString('en-SA', { weekday: 'short' })}</div>
                  <div className="text-lg font-bold">{date.getDate()}</div>
                  {isToday(date) && <div className="text-[10px] text-[#FF8C00]">Today</div>}
                </button>
              ))}
            </div>
          </div>

          {/* Time Selection */}
          {selectedDate && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Select Time</h3>
              
              <div className="space-y-4">
                {/* Morning */}
                <div>
                  <p className="text-sm text-gray-600 mb-2">Morning</p>
                  <div className="grid grid-cols-3 gap-2">
                    {morningSlots.map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`py-2 rounded-lg border text-sm transition-colors ${
                          selectedTime === time
                            ? 'border-[#FFB400] bg-orange-50 text-gray-900 font-semibold'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Afternoon */}
                <div>
                  <p className="text-sm text-gray-600 mb-2">Afternoon</p>
                  <div className="grid grid-cols-3 gap-2">
                    {afternoonSlots.map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`py-2 rounded-lg border text-sm transition-colors ${
                          selectedTime === time
                            ? 'border-[#FFB400] bg-orange-50 text-gray-900 font-semibold'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Evening */}
                <div>
                  <p className="text-sm text-gray-600 mb-2">Evening</p>
                  <div className="grid grid-cols-3 gap-2">
                    {eveningSlots.map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`py-2 rounded-lg border text-sm transition-colors ${
                          selectedTime === time
                            ? 'border-[#FFB400] bg-orange-50 text-gray-900 font-semibold'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep('type')}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
            >
              Back
            </button>
            <button
              onClick={() => setStep('details')}
              disabled={!selectedDate || !selectedTime}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#FFB400] to-[#FF8C00] text-white rounded-lg hover:shadow-lg transition-shadow font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Additional Details */}
      {step === 'details' && (
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Additional Information</h3>
            
            {/* Participants */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Who will attend?</label>
              {participants.map((participant, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Name"
                    value={participant.name}
                    onChange={(e) => {
                      const updated = [...participants];
                      updated[idx].name = e.target.value;
                      setParticipants(updated);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB400] focus:border-transparent"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={participant.phone}
                    onChange={(e) => {
                      const updated = [...participants];
                      updated[idx].phone = e.target.value;
                      setParticipants(updated);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB400] focus:border-transparent"
                  />
                  {idx > 0 && (
                    <button
                      onClick={() => removeParticipant(idx)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addParticipant}
                className="text-sm text-[#FF8C00] hover:text-[#FFB400] font-medium"
              >
                + Add Another Person
              </button>
            </div>

            {/* Special Requests */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Special Requests (Optional)</label>
              <textarea
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="Any specific areas you'd like to focus on? Accessibility requirements? Questions for the agent?"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFB400] focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('datetime')}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
            >
              Back
            </button>
            <button
              onClick={() => setStep('confirm')}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#FFB400] to-[#FF8C00] text-white rounded-lg hover:shadow-lg transition-shadow font-semibold"
            >
              Review
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === 'confirm' && (
        <div className="space-y-6">
          <h3 className="font-semibold text-gray-900 mb-4">Confirm Your Viewing</h3>
          
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div>
              <p className="text-sm text-gray-600">Property</p>
              <p className="font-semibold text-gray-900">{propertyTitle}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Type</p>
              <p className="font-semibold text-gray-900">
                {viewingType === 'IN_PERSON' && 'In-Person Viewing'}
                {viewingType === 'VIDEO_CALL' && 'Live Video Call'}
                {viewingType === 'VIRTUAL' && 'Virtual Tour'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Date & Time</p>
              <p className="font-semibold text-gray-900">
                {selectedDate && formatDate(selectedDate)} at {selectedTime}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Attendees</p>
              <p className="font-semibold text-gray-900">
                {participants.filter((p) => p.name).map((p) => p.name).join(', ')}
              </p>
            </div>
            {specialRequests && (
              <div>
                <p className="text-sm text-gray-600">Special Requests</p>
                <p className="font-semibold text-gray-900">{specialRequests}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('details')}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#FFB400] to-[#FF8C00] text-white rounded-lg hover:shadow-lg transition-shadow font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Scheduling...' : 'Confirm Booking'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
