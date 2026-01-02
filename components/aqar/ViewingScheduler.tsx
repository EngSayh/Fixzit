"use client";

import { useState } from "react";
import {
  Calendar,
  Clock,
  Phone,
  Video,
  MapPin,
  CheckCircle,
} from "@/components/ui/icons";
import { useTranslation } from "@/contexts/TranslationContext";
import { logger } from "@/lib/logger";

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
  viewingType: "IN_PERSON" | "VIRTUAL" | "VIDEO_CALL";
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
  onSchedule,
}: ViewingSchedulerProps) {
  const { t, isRTL } = useTranslation();
  const [step, setStep] = useState<
    "type" | "datetime" | "details" | "confirm" | "success"
  >("type");
  const [viewingType, setViewingType] = useState<
    "IN_PERSON" | "VIRTUAL" | "VIDEO_CALL"
  >("IN_PERSON");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  // const [alternativeDates, setAlternativeDates] = useState<Date[]>([]); // Reserved for future multi-date selection
  const [participants, setParticipants] = useState([
    { name: "", phone: "", relationship: "Primary" },
  ]);
  const [specialRequests, setSpecialRequests] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

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
  const morningSlots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];
  const afternoonSlots = ["14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];
  const eveningSlots = ["17:00", "17:30", "18:00", "18:30", "19:00"];

  // const allTimeSlots = [...morningSlots, ...afternoonSlots, ...eveningSlots]; // Available if needed for future features

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-SA", {
      weekday: "short",
      day: "numeric",
      month: "short",
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
    setParticipants([
      ...participants,
      { name: "", phone: "", relationship: "Family" },
    ]);
  };

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) return;

    setIsSubmitting(true);
    setError("");
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

      setStep("success");
    } catch (error) {
      logger.error("Failed to schedule viewing:", { error });
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to schedule viewing. Please try again.";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === "success") {
    return (
      <div className="bg-card rounded-2xl shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {t("aqar.viewing.scheduled", "Viewing Scheduled!")}
        </h2>
        <p className="text-muted-foreground mb-6">
          {t(
            "aqar.viewing.confirmationSent",
            `Your viewing request has been sent to ${agentName}. You will receive a confirmation shortly.`,
          )}
        </p>
        <div className="bg-muted rounded-lg p-4 mb-6 text-start">
          <h3 className="font-semibold text-foreground mb-3">
            {t("aqar.viewing.details", "Viewing Details")}
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground">{propertyTitle}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground">
                {selectedDate && formatDate(selectedDate)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground">{selectedTime}</span>
            </div>
            <div className="flex items-center gap-2">
              {viewingType === "IN_PERSON" && (
                <MapPin className="w-4 h-4 text-muted-foreground" />
              )}
              {viewingType === "VIDEO_CALL" && (
                <Video className="w-4 h-4 text-muted-foreground" />
              )}
              {viewingType === "VIRTUAL" && (
                <Phone className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-foreground">
                {viewingType === "IN_PERSON" && "In-Person Viewing"}
                {viewingType === "VIDEO_CALL" && "Video Call"}
                {viewingType === "VIRTUAL" && "Virtual Tour"}
              </span>
            </div>
          </div>
        </div>
        <button type="button"
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-gradient-to-r from-accent to-accent-dark text-white rounded-lg hover:shadow-lg transition-shadow"
          aria-label="Schedule another property viewing"
          title="Schedule another viewing"
        >
          Schedule Another Viewing
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl shadow-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {t("aqar.viewing.scheduleTitle", "Schedule a Viewing")}
        </h2>
        <p className="text-sm text-muted-foreground">{propertyTitle}</p>
        <p className="text-xs text-muted-foreground">{propertyAddress}</p>
      </div>

      {/* Progress Steps */}
      <div
        className={`flex items-center justify-between mb-8 ${isRTL ? "flex-row-reverse" : ""}`}
      >
        {[
          t("aqar.viewing.steps.type", "Type"),
          t("aqar.viewing.steps.dateTime", "Date & Time"),
          t("aqar.viewing.steps.details", "Details"),
          t("aqar.viewing.steps.confirm", "Confirm"),
        ].map((label, idx) => {
          const stepKeys = ["type", "datetime", "details", "confirm"];
          const currentIdx = stepKeys.indexOf(step);
          const isActive = idx === currentIdx;
          const isCompleted = idx < currentIdx;

          return (
            <div
              key={label}
              className={`flex items-center flex-1 ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  isCompleted
                    ? "bg-success"
                    : isActive
                      ? "bg-accent"
                      : "bg-muted"
                } text-white text-sm font-semibold`}
              >
                {isCompleted ? "✓" : idx + 1}
              </div>
              <span
                className={`${isRTL ? "me-2" : "ms-2"} text-sm ${isActive ? "font-semibold text-foreground" : "text-muted-foreground"}`}
              >
                {label}
              </span>
              {idx < 3 && (
                <div
                  className={`flex-1 h-1 mx-2 ${isCompleted ? "bg-success" : "bg-muted"}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1: Viewing Type */}
      {step === "type" && (
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground mb-4">
            {t(
              "aqar.viewing.typeQuestion",
              "How would you like to view this property?",
            )}
          </h3>

          <button type="button"
            onClick={() => setViewingType("IN_PERSON")}
            className={`w-full p-4 rounded-lg border-2 transition-colors ${isRTL ? "text-end" : "text-start"} ${
              viewingType === "IN_PERSON"
                ? "border-accent bg-accent/10"
                : "border-border hover:border-border"
            }`}
            aria-label={t("aqar.viewing.types.inPerson.ariaLabel", "Select in-person viewing - visit the property with the agent")}
            aria-pressed={viewingType === "IN_PERSON"}
          >
            <div
              className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <MapPin className="w-6 h-6 text-accent-dark mt-1" />
              <div>
                <h4 className="font-semibold text-foreground">
                  {t("aqar.viewing.types.inPerson", "In-Person Viewing")}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "aqar.viewing.types.inPersonDesc",
                    "Visit the property with the agent",
                  )}
                </p>
              </div>
            </div>
          </button>

          <button type="button"
            onClick={() => setViewingType("VIDEO_CALL")}
            className={`w-full p-4 rounded-lg border-2 transition-colors ${isRTL ? "text-end" : "text-start"} ${
              viewingType === "VIDEO_CALL"
                ? "border-accent bg-accent/10"
                : "border-border hover:border-border"
            }`}
            aria-label={t("aqar.viewing.types.videoCall.ariaLabel", "Select video call - virtual walkthrough with agent via video")}
            aria-pressed={viewingType === "VIDEO_CALL"}
          >
            <div
              className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <Video className="w-6 h-6 text-accent-dark mt-1" />
              <div>
                <h4 className="font-semibold text-foreground">
                  {t("aqar.viewing.types.videoCall", "Live Video Call")}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "aqar.viewing.types.videoCallDesc",
                    "Virtual walkthrough with agent via video call",
                  )}
                </p>
              </div>
            </div>
          </button>

          <button type="button"
            onClick={() => setViewingType("VIRTUAL")}
            className={`w-full p-4 rounded-lg border-2 transition-colors ${isRTL ? "text-end" : "text-start"} ${
              viewingType === "VIRTUAL"
                ? "border-accent bg-accent/10"
                : "border-border hover:border-border"
            }`}
            aria-label={t("aqar.viewing.types.virtual.ariaLabel", "Select virtual tour - self-guided 360 degree tour")}
            aria-pressed={viewingType === "VIRTUAL"}
          >
            <div
              className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <Phone className="w-6 h-6 text-accent-dark mt-1" />
              <div>
                <h4 className="font-semibold text-foreground">
                  {t("aqar.viewing.types.virtual", "Virtual Tour")}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "aqar.viewing.types.virtualDesc",
                    "Self-guided 360° virtual tour",
                  )}
                </p>
              </div>
            </div>
          </button>

          <button type="button"
            onClick={() => setStep("datetime")}
            className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-accent to-accent-dark text-white rounded-lg hover:shadow-lg transition-shadow font-semibold"
            aria-label={t("aqar.viewing.buttons.continue.ariaLabel", "Continue to date and time selection")}
          >
            {t("aqar.viewing.buttons.continue", "Continue")}
          </button>
        </div>
      )}

      {/* Step 2: Date & Time Selection */}
      {step === "datetime" && (
        <div className="space-y-6">
          {/* Date Selection */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">
              {t("aqar.viewing.selectDate", "Select Date")}
            </h3>
            <div className="grid grid-cols-7 gap-2">
              {availableDates.map((date) => (
                <button type="button"
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  aria-label={`Select date ${date.toLocaleDateString("en-SA", { weekday: "long", month: "short", day: "numeric" })}`}
                  aria-pressed={selectedDate?.toDateString() === date.toDateString()}
                  className={`p-2 rounded-lg border text-center transition-colors ${
                    selectedDate &&
                    selectedDate.toDateString() === date.toDateString()
                      ? "border-accent bg-accent/10 text-foreground"
                      : "border-border hover:border-border text-foreground"
                  }`}
                >
                  <div className="text-xs font-semibold">
                    {date.toLocaleDateString("en-SA", { weekday: "short" })}
                  </div>
                  <div className="text-lg font-bold">{date.getDate()}</div>
                  {isToday(date) && (
                    <div className="text-[10px] text-accent-dark">
                      {t("aqar.viewing.today", "Today")}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Time Selection */}
          {selectedDate && (
            <div>
              <h3 className="font-semibold text-foreground mb-3">
                {t("aqar.viewing.selectTime", "Select Time")}
              </h3>

              <div className="space-y-4">
                {/* Morning */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Morning</p>
                  <div className="grid grid-cols-3 gap-2">
                    {morningSlots.map((time) => (
                      <button type="button"
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        aria-label={`Select morning time slot ${time}`}
                        aria-pressed={selectedTime === time}
                        className={`py-2 rounded-lg border text-sm transition-colors ${
                          selectedTime === time
                            ? "border-warning bg-orange-50 text-foreground font-semibold"
                            : "border-border hover:border-border text-foreground"
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Afternoon */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Afternoon
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {afternoonSlots.map((time) => (
                      <button type="button"
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        aria-label={`Select afternoon time slot ${time}`}
                        aria-pressed={selectedTime === time}
                        className={`py-2 rounded-lg border text-sm transition-colors ${
                          selectedTime === time
                            ? "border-accent bg-accent/10 text-foreground font-semibold"
                            : "border-border hover:border-border text-foreground"
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Evening */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Evening</p>
                  <div className="grid grid-cols-3 gap-2">
                    {eveningSlots.map((time) => (
                      <button type="button"
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        aria-label={`Select evening time slot ${time}`}
                        aria-pressed={selectedTime === time}
                        className={`py-2 rounded-lg border text-sm transition-colors ${
                          selectedTime === time
                            ? "border-accent bg-accent/10 text-foreground font-semibold"
                            : "border-border hover:border-border text-foreground"
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
            <button type="button"
              onClick={() => setStep("type")}
              className="flex-1 px-6 py-3 border border-border text-foreground rounded-lg hover:bg-muted transition-colors font-semibold"
              aria-label="Go back to viewing type selection"
            >
              Back
            </button>
            <button type="button"
              onClick={() => setStep("details")}
              disabled={!selectedDate || !selectedTime}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-accent to-accent-dark text-white rounded-lg hover:shadow-lg transition-shadow font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Continue to additional details"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Additional Details */}
      {step === "details" && (
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-foreground mb-4">
              Additional Information
            </h3>

            {/* Participants */}
            <div className="mb-4">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Who will attend?
              </label>
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
                    className="flex-1 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
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
                    className="flex-1 px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                  {idx > 0 && (
                    <button type="button"
                      onClick={() => removeParticipant(idx)}
                      className="px-3 py-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      aria-label={`Remove participant ${participant.name || idx + 1}`}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button type="button"
                onClick={addParticipant}
                className="text-sm text-accent-dark hover:text-accent font-medium"
                aria-label="Add another participant to the viewing"
              >
                + Add Another Person
              </button>
            </div>

            {/* Special Requests */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Special Requests (Optional)
              </label>
              <textarea
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="Any specific areas you'd like to focus on? Accessibility requirements? Questions for the agent?"
                rows={4}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button"
              onClick={() => setStep("datetime")}
              className="flex-1 px-6 py-3 border border-border text-foreground rounded-lg hover:bg-muted transition-colors font-semibold"
              aria-label="Go back to date and time selection"
            >
              Back
            </button>
            <button type="button"
              onClick={() => setStep("confirm")}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-accent to-accent-dark text-white rounded-lg hover:shadow-lg transition-shadow font-semibold"
              aria-label="Review your viewing booking"
            >
              Review
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="mt-4 p-3 bg-destructive/10 border border-destructive rounded-lg text-destructive text-sm"
              role="alert"
            >
              {error}
            </div>
          )}
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === "confirm" && (
        <div className="space-y-6">
          <h3 className="font-semibold text-foreground mb-4">
            Confirm Your Viewing
          </h3>

          <div className="bg-muted rounded-lg p-4 space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Property</p>
              <p className="font-semibold text-foreground">{propertyTitle}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-semibold text-foreground">
                {viewingType === "IN_PERSON" && "In-Person Viewing"}
                {viewingType === "VIDEO_CALL" && "Live Video Call"}
                {viewingType === "VIRTUAL" && "Virtual Tour"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date & Time</p>
              <p className="font-semibold text-foreground">
                {selectedDate && formatDate(selectedDate)} at {selectedTime}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Attendees</p>
              <p className="font-semibold text-foreground">
                {participants
                  .filter((p) => p.name)
                  .map((p) => p.name)
                  .join(", ")}
              </p>
            </div>
            {specialRequests && (
              <div>
                <p className="text-sm text-muted-foreground">
                  Special Requests
                </p>
                <p className="font-semibold text-foreground">
                  {specialRequests}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button type="button"
              onClick={() => setStep("details")}
              className="flex-1 px-6 py-3 border border-border text-foreground rounded-lg hover:bg-muted transition-colors font-semibold"
              aria-label="Go back to additional details"
            >
              Back
            </button>
            <button type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-accent to-accent-dark text-white rounded-lg hover:shadow-lg transition-shadow font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Confirm and submit your viewing booking"
            >
              {isSubmitting ? "Scheduling..." : "Confirm Booking"}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="mt-4 p-3 bg-destructive/10 border border-destructive rounded-lg text-destructive text-sm"
              role="alert"
            >
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
