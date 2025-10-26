'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface JobApplicationFormProps {
  jobId: string;
}

export function JobApplicationForm({ jobId }: JobApplicationFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      
      // Validate file upload
      const resumeFile = formData.get('resume') as File;
      if (!resumeFile || resumeFile.size === 0) {
        toast.error('Please upload your CV/Resume (PDF)');
        setIsSubmitting(false);
        return;
      }

      if (resumeFile.type !== 'application/pdf') {
        toast.error('Resume must be a PDF file');
        setIsSubmitting(false);
        return;
      }

      if (resumeFile.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Resume file size must be less than 5MB');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(`/api/ats/jobs/${jobId}/apply`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit application');
      }

      toast.success('Application submitted successfully! We\'ll review your application and get back to you soon.');
      
      // Reset form
      e.currentTarget.reset();
      
      // Optional: Redirect to success page after a delay
      setTimeout(() => {
        router.push('/careers?applied=true');
      }, 2000);

    } catch (error) {
      console.error('Application submission error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className="mt-8 bg-gray-50 p-6 rounded-md"
    >
      <h3 className="text-xl font-semibold mb-4">Apply Now</h3>
      
      <div className="grid md:grid-cols-2 gap-4">
        {/* Full Name */}
        <div className="flex flex-col">
          <label htmlFor="fullName" className="mb-1 text-sm font-semibold text-gray-700">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input 
            id="fullName"
            name="fullName" 
            type="text"
            placeholder="John Doe" 
            required 
            className="border border-gray-300 p-2 rounded focus:ring-2 focus:ring-brand-500 focus:border-transparent" 
            disabled={isSubmitting}
          />
        </div>

        {/* Email */}
        <div className="flex flex-col">
          <label htmlFor="email" className="mb-1 text-sm font-semibold text-gray-700">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input 
            id="email"
            name="email" 
            type="email"
            placeholder="john@example.com" 
            required 
            className="border border-gray-300 p-2 rounded focus:ring-2 focus:ring-brand-500 focus:border-transparent" 
            disabled={isSubmitting}
          />
        </div>

        {/* Phone */}
        <div className="flex flex-col">
          <label htmlFor="phone" className="mb-1 text-sm font-semibold text-gray-700">
            Phone Number
          </label>
          <input 
            id="phone"
            name="phone" 
            type="tel"
            placeholder="+966 50 123 4567" 
            className="border border-gray-300 p-2 rounded focus:ring-2 focus:ring-brand-500 focus:border-transparent" 
            disabled={isSubmitting}
          />
        </div>

        {/* Location */}
        <div className="flex flex-col">
          <label htmlFor="location" className="mb-1 text-sm font-semibold text-gray-700">
            Location
          </label>
          <input 
            id="location"
            name="location" 
            type="text"
            placeholder="Riyadh, Saudi Arabia" 
            className="border border-gray-300 p-2 rounded focus:ring-2 focus:ring-brand-500 focus:border-transparent" 
            disabled={isSubmitting}
          />
        </div>

        {/* Years of Experience */}
        <div className="flex flex-col">
          <label htmlFor="experience" className="mb-1 text-sm font-semibold text-gray-700">
            Years of Experience
          </label>
          <input 
            id="experience"
            name="experience" 
            type="number"
            min="0"
            max="50"
            placeholder="5" 
            className="border border-gray-300 p-2 rounded focus:ring-2 focus:ring-brand-500 focus:border-transparent" 
            disabled={isSubmitting}
          />
        </div>

        {/* LinkedIn */}
        <div className="flex flex-col">
          <label htmlFor="linkedin" className="mb-1 text-sm font-semibold text-gray-700">
            LinkedIn Profile
          </label>
          <input 
            id="linkedin"
            name="linkedin" 
            type="url"
            placeholder="https://linkedin.com/in/yourprofile" 
            className="border border-gray-300 p-2 rounded focus:ring-2 focus:ring-brand-500 focus:border-transparent" 
            disabled={isSubmitting}
          />
        </div>

        {/* Skills */}
        <div className="flex flex-col md:col-span-2">
          <label htmlFor="skills" className="mb-1 text-sm font-semibold text-gray-700">
            Key Skills
          </label>
          <input 
            id="skills"
            name="skills" 
            type="text"
            placeholder="React, TypeScript, Node.js, MongoDB" 
            className="border border-gray-300 p-2 rounded focus:ring-2 focus:ring-brand-500 focus:border-transparent" 
            disabled={isSubmitting}
          />
          <p className="text-xs text-gray-500 mt-1">Separate skills with commas</p>
        </div>
      </div>

      {/* Cover Letter */}
      <div className="flex flex-col mt-4">
        <label htmlFor="coverLetter" className="mb-1 text-sm font-semibold text-gray-700">
          Cover Letter
        </label>
        <textarea 
          id="coverLetter"
          name="coverLetter" 
          placeholder="Tell us why you're interested in this position and what makes you a great fit..." 
          className="border border-gray-300 p-2 rounded w-full focus:ring-2 focus:ring-brand-500 focus:border-transparent" 
          rows={5}
          disabled={isSubmitting}
        />
      </div>

      {/* Resume Upload */}
      <div className="mt-4">
        <label htmlFor="resume" className="block text-sm font-semibold text-gray-700 mb-1">
          CV / Résumé (PDF) <span className="text-red-500">*</span>
        </label>
        <input 
          id="resume"
          name="resume" 
          type="file" 
          accept="application/pdf" 
          required
          className="mt-1 block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded file:border-0
            file:text-sm file:font-semibold
            file:bg-brand-50 file:text-brand-700
            hover:file:bg-brand-100
            disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        />
        <p className="text-xs text-gray-500 mt-1">Maximum file size: 5MB</p>
      </div>

      {/* Submit Button */}
      <button 
        type="submit"
        disabled={isSubmitting}
        className="mt-6 px-6 py-3 bg-brand-500 text-white rounded-lg hover:bg-brand-600 
                   transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed
                   focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Submitting Application...
          </span>
        ) : (
          'Submit Application'
        )}
      </button>

      <p className="text-xs text-gray-500 mt-3">
        By submitting this application, you agree to our privacy policy and terms of service.
      </p>
    </form>
  );
}
