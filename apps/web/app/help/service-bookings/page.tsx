'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Footer } from '@/src/components/layout/Footer';
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  CreditCard, 
  DollarSign, 
  MessageCircle,
  Shield,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  FileText,
  Video,
  MapPin,
  Users,
  TrendingUp
} from 'lucide-react';

export default function ServiceBookingsPage() {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900'
        : 'bg-gray-50'
    }`}>
      <main className="main-container py-8 lg:py-12">
        {/* Breadcrumb Navigation */}
        <nav className="mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <Link 
                href="/help" 
                className={`hover:underline ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                Help Center
              </Link>
            </li>
            <li className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>/</li>
            <li>
              <Link 
                href="/help/service-bookings" 
                className={`font-medium ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}
              >
                Managing Bookings and Payments
              </Link>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-purple-500 mb-6">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h1 className={`text-4xl lg:text-5xl font-bold mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            How Bookings Work: Complete Guide
          </h1>
          <p className={`text-lg lg:text-xl max-w-3xl ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Understanding the complete booking workflow from request to payment. Learn how clients book your services, how payments are protected, and how to deliver services successfully.
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto space-y-12">
          
          {/* Overview */}
          <section>
            <h2 className={`text-3xl font-bold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              The Complete Booking Journey
            </h2>
            <div className={`prose prose-lg max-w-none ${
              theme === 'dark' ? 'prose-invert' : ''
            }`}>
              <p className={`text-lg leading-relaxed mb-6 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                When someone books your service, it goes through several stages. Understanding this process helps you manage expectations and deliver great experiences. Here's the complete flow:
              </p>
              
              {/* Booking Status Flow Diagram */}
              <div className={`p-6 rounded-xl border mb-8 ${
                theme === 'dark'
                  ? 'bg-white/5 backdrop-blur-lg border-white/10'
                  : 'bg-white border-gray-200 shadow-sm'
              }`}>
                <h3 className={`text-xl font-semibold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Booking Status Flow
                </h3>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  {[
                    { status: 'Pending', icon: Clock, color: 'yellow' },
                    { status: 'Confirmed', icon: CheckCircle, color: 'blue' },
                    { status: 'Paid', icon: CreditCard, color: 'green' },
                    { status: 'Completed', icon: TrendingUp, color: 'purple' }
                  ].map((item, index) => (
                    <React.Fragment key={item.status}>
                      <div className={`flex flex-col items-center gap-2 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          theme === 'dark'
                            ? `bg-${item.color}-500/20 border-${item.color}-500/40`
                            : `bg-${item.color}-100 border-${item.color}-300`
                        } border-2`}>
                          <item.icon className={`w-6 h-6 ${
                            theme === 'dark' ? `text-${item.color}-400` : `text-${item.color}-600`
                          }`} />
                        </div>
                        <span className="text-sm font-medium">{item.status}</span>
                      </div>
                      {index < 3 && (
                        <ArrowRight className={`w-6 h-6 ${
                          theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                        }`} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Step-by-Step Process */}
          <section>
            <h2 className={`text-3xl font-bold mb-6 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Step-by-Step: What Happens When Someone Books You
            </h2>
            
            <div className="space-y-6">
              {/* Step 1 */}
              <div className={`p-6 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-white/5 border-white/10'
                  : 'bg-white border-gray-200 shadow-sm'
              }`}>
                <div className="flex items-start gap-4">
                  <span className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                    theme === 'dark' ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    1
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className={`w-5 h-5 ${
                        theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                      }`} />
                      <h3 className={`text-2xl font-semibold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        Booking Request Received (Status: Pending)
                      </h3>
                    </div>
                    <p className={`text-lg leading-relaxed mb-4 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      A client finds your profile, selects a service offering, and submits a booking request. They'll include:
                    </p>
                    <ul className={`space-y-2 mb-4 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      <li>• <strong>Service Offering:</strong> Which specific service they want (e.g., "Full Mix & Master")</li>
                      <li>• <strong>Date & Time:</strong> When they need the service</li>
                      <li>• <strong>Total Amount:</strong> The agreed price (or your offering rate)</li>
                      <li>• <strong>Booking Notes:</strong> Special requirements, project details, or questions</li>
                    </ul>
                    <div className={`p-4 rounded-lg mt-4 ${
                      theme === 'dark'
                        ? 'bg-blue-500/10 border border-blue-500/20'
                        : 'bg-blue-50 border border-blue-200'
                    }`}>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-blue-300' : 'text-blue-900'
                      }`}>
                        <strong>💡 You'll receive:</strong> An email notification and an in-app notification. You can view the full request in your Service Provider dashboard under "Bookings".
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className={`p-6 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-white/5 border-white/10'
                  : 'bg-white border-gray-200 shadow-sm'
              }`}>
                <div className="flex items-start gap-4">
                  <span className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                    theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
                  }`}>
                    2
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className={`w-5 h-5 ${
                        theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                      }`} />
                      <h3 className={`text-2xl font-semibold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        Review and Confirm (Status: Confirmed - Awaiting Payment)
                      </h3>
                    </div>
                    <p className={`text-lg leading-relaxed mb-4 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      You have three options when reviewing a booking request:
                    </p>
                    <div className="space-y-3 mb-4">
                      <div className={`p-4 rounded-lg ${
                        theme === 'dark'
                          ? 'bg-green-500/10 border border-green-500/20'
                          : 'bg-green-50 border border-green-200'
                      }`}>
                        <p className={`font-semibold mb-1 ${
                          theme === 'dark' ? 'text-green-300' : 'text-green-900'
                        }`}>
                          ✅ Accept the Booking
                        </p>
                        <p className={`text-sm ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Click "Confirm" if the date, time, and details work for you. The booking status changes to "Confirmed - Awaiting Payment" and the client is notified to proceed with payment.
                        </p>
                      </div>
                      <div className={`p-4 rounded-lg ${
                        theme === 'dark'
                          ? 'bg-red-500/10 border border-red-500/20'
                          : 'bg-red-50 border border-red-200'
                      }`}>
                        <p className={`font-semibold mb-1 ${
                          theme === 'dark' ? 'text-red-300' : 'text-red-900'
                        }`}>
                          ❌ Decline the Booking
                        </p>
                        <p className={`text-sm ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          If you're not available or can't take on the project, politely decline. The client will be notified and can look for another provider.
                        </p>
                      </div>
                      <div className={`p-4 rounded-lg ${
                        theme === 'dark'
                          ? 'bg-yellow-500/10 border border-yellow-500/20'
                          : 'bg-yellow-50 border border-yellow-200'
                      }`}>
                        <p className={`font-semibold mb-1 ${
                          theme === 'dark' ? 'text-yellow-300' : 'text-yellow-900'
                        }`}>
                          💬 Request Changes
                        </p>
                        <p className={`text-sm ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Use the messaging system to discuss different dates, times, or project details before confirming.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className={`p-6 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-white/5 border-white/10'
                  : 'bg-white border-gray-200 shadow-sm'
              }`}>
                <div className="flex items-start gap-4">
                  <span className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                    theme === 'dark' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700'
                  }`}>
                    3
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className={`w-5 h-5 ${
                        theme === 'dark' ? 'text-green-400' : 'text-green-600'
                      }`} />
                      <h3 className={`text-2xl font-semibold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        Client Pays (Status: Paid - Funds in Escrow)
                      </h3>
                    </div>
                    <p className={`text-lg leading-relaxed mb-4 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Once you confirm, the client pays through Stripe (secure payment processing). Here's what happens:
                    </p>
                    <div className={`p-6 rounded-lg mb-4 ${
                      theme === 'dark'
                        ? 'bg-purple-500/10 border border-purple-500/20'
                        : 'bg-purple-50 border border-purple-200'
                    }`}>
                      <div className="flex items-start gap-3 mb-3">
                        <Shield className={`w-6 h-6 flex-shrink-0 ${
                          theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                        }`} />
                        <div>
                          <p className={`font-semibold mb-2 ${
                            theme === 'dark' ? 'text-purple-300' : 'text-purple-900'
                          }`}>
                            🔒 Payment Protection (Escrow)
                          </p>
                          <p className={`text-sm leading-relaxed ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            The money is held securely in escrow (like a safe deposit box) until you complete the work. This protects both you and the client:
                          </p>
                          <ul className={`mt-3 space-y-2 text-sm ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            <li>✅ <strong>For You:</strong> The client can't cancel and get a refund after you've completed the work</li>
                            <li>✅ <strong>For Client:</strong> You can't take the money without delivering the service</li>
                            <li>✅ <strong>For Both:</strong> Disputes are handled fairly through SoundBridge support</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <strong>Note:</strong> You'll see the payment status in your dashboard. The booking status changes to "Paid" once payment is confirmed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className={`p-6 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-white/5 border-white/10'
                  : 'bg-white border-gray-200 shadow-sm'
              }`}>
                <div className="flex items-start gap-4">
                  <span className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                    theme === 'dark' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'
                  }`}>
                    4
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className={`w-5 h-5 ${
                        theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                      }`} />
                      <h3 className={`text-2xl font-semibold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        Deliver the Service
                      </h3>
                    </div>
                    <p className={`text-lg leading-relaxed mb-4 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Now it's time to do the work! How you deliver depends on your service type:
                    </p>
                    
                    {/* Service Delivery Methods */}
                    <div className="space-y-4 mb-4">
                      <div className={`p-4 rounded-lg ${
                        theme === 'dark'
                          ? 'bg-white/5 border border-white/10'
                          : 'bg-white border border-gray-200'
                      }`}>
                        <div className="flex items-start gap-3">
                          <MapPin className={`w-5 h-5 flex-shrink-0 mt-1 ${
                            theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                          }`} />
                          <div>
                            <h4 className={`font-semibold mb-1 ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              In-Person Services
                            </h4>
                            <p className={`text-sm ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              Meet at the agreed location and time. Examples: music lessons, event photography, live sound engineering.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className={`p-4 rounded-lg ${
                        theme === 'dark'
                          ? 'bg-white/5 border border-white/10'
                          : 'bg-white border border-gray-200'
                      }`}>
                        <div className="flex items-start gap-3">
                          <Video className={`w-5 h-5 flex-shrink-0 mt-1 ${
                            theme === 'dark' ? 'text-green-400' : 'text-green-600'
                          }`} />
                          <div>
                            <h4 className={`font-semibold mb-1 ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              Online Services
                            </h4>
                            <p className={`text-sm ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              Use video calls (Zoom, Google Meet) or share files through messaging. Examples: online music lessons, remote mixing/mastering, virtual consultations.
                            </p>
                            <p className={`text-xs mt-2 ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              💡 Tip: Share the video call link through SoundBridge messaging before the session.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className={`p-4 rounded-lg ${
                        theme === 'dark'
                          ? 'bg-white/5 border border-white/10'
                          : 'bg-white border border-gray-200'
                      }`}>
                        <div className="flex items-start gap-3">
                          <MessageCircle className={`w-5 h-5 flex-shrink-0 mt-1 ${
                            theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                          }`} />
                          <div>
                            <h4 className={`font-semibold mb-1 ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              File-Based Services
                            </h4>
                            <p className={`text-sm ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              Upload deliverables through SoundBridge messaging or share links (Google Drive, Dropbox). Examples: mixing/mastering, graphic design, written content.
                            </p>
                            <p className={`text-xs mt-2 ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              💡 Tip: Use SoundBridge messaging to keep all communication and files in one place.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div className={`p-6 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-white/5 border-white/10'
                  : 'bg-white border-gray-200 shadow-sm'
              }`}>
                <div className="flex items-start gap-4">
                  <span className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                    theme === 'dark' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    5
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className={`w-5 h-5 ${
                        theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                      }`} />
                      <h3 className={`text-2xl font-semibold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        Mark Complete & Get Paid (Status: Completed)
                      </h3>
                    </div>
                    <p className={`text-lg leading-relaxed mb-4 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Once you've delivered the service:
                    </p>
                    <ol className={`space-y-3 mb-4 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      <li>
                        <strong>1. Mark as Complete:</strong> In your dashboard, click "Mark as Complete" on the booking. This notifies the client that the work is done.
                      </li>
                      <li>
                        <strong>2. Payment Release:</strong> The funds are automatically released to your connected Stripe account (minus platform fee). This usually takes 2-5 business days.
                      </li>
                      <li>
                        <strong>3. Client Reviews:</strong> The client can leave a review and rating, which appears on your profile.
                      </li>
                    </ol>
                    <div className={`p-4 rounded-lg mt-4 ${
                      theme === 'dark'
                        ? 'bg-yellow-500/10 border border-yellow-500/20'
                        : 'bg-yellow-50 border border-yellow-200'
                    }`}>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-yellow-300' : 'text-yellow-900'
                      }`}>
                        <strong>⚠️ Important:</strong> If there's a dispute or the client isn't satisfied, contact SoundBridge support. We'll help resolve the issue fairly before releasing payment.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Communication */}
          <section>
            <h2 className={`text-3xl font-bold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Communication Throughout the Process
            </h2>
            <div className={`prose prose-lg max-w-none ${
              theme === 'dark' ? 'prose-invert' : ''
            }`}>
              <p className={`text-lg leading-relaxed mb-4 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Clear communication is key to successful bookings. Here's how to stay in touch:
              </p>
              <ul className={`space-y-3 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <li>
                  <strong>📧 Email Notifications:</strong> You'll receive emails for booking requests, status changes, and messages.
                </li>
                <li>
                  <strong>💬 In-App Messaging:</strong> Use SoundBridge's messaging system to discuss project details, share files, and coordinate.
                </li>
                <li>
                  <strong>📝 Booking Notes:</strong> Initial communication happens through booking notes. Use messaging for follow-up questions.
                </li>
              </ul>
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h2 className={`text-3xl font-bold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              {[
                {
                  q: "What if a client cancels after paying?",
                  a: "If a client cancels before you've started work, they can request a refund. If you've already started or completed work, the payment remains with you. Disputes are handled case-by-case by SoundBridge support."
                },
                {
                  q: "How long do I have to respond to a booking request?",
                  a: "There's no strict deadline, but responding within 24-48 hours is recommended. Clients appreciate quick responses and are more likely to book providers who respond promptly."
                },
                {
                  q: "Can I change the price after confirming?",
                  a: "Once a booking is confirmed and paid, the price is locked. If you need to adjust pricing, discuss it with the client before confirming. You can also decline and ask them to submit a new request with the correct amount."
                },
                {
                  q: "What happens if I can't complete the work?",
                  a: "Contact the client immediately through messaging to discuss options. You may need to refund or find a solution. If you can't resolve it, contact SoundBridge support for help."
                },
                {
                  q: "When do I get paid?",
                  a: "Payment is released after you mark the booking as complete. Funds are transferred to your Stripe account within 2-5 business days, then to your bank account per Stripe's payout schedule."
                }
              ].map((faq, index) => (
                <div key={index} className={`p-6 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-white/5 border-white/10'
                    : 'bg-white border-gray-200 shadow-sm'
                }`}>
                  <h3 className={`text-xl font-semibold mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {faq.q}
                  </h3>
                  <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Related Articles */}
          <section>
            <div className={`p-6 rounded-xl border ${
              theme === 'dark'
                ? 'bg-white/5 backdrop-blur-lg border-white/10'
                : 'bg-white border-gray-200 shadow-sm'
            }`}>
              <h3 className={`text-xl font-semibold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Related Articles
              </h3>
              <div className="space-y-2">
                <Link 
                  href="/help/service-provider-guide" 
                  className={`block hover:underline ${
                    theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  → Complete Service Provider Guide
                </Link>
                <Link 
                  href="/help/payments" 
                  className={`block hover:underline ${
                    theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  → How Payments Work
                </Link>
                <Link 
                  href="/help/service-verification" 
                  className={`block hover:underline ${
                    theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  → Getting Verified as a Provider
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

