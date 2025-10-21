'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, AlertTriangle, FileText, Mail, Scale, Users } from 'lucide-react';

export default function CopyrightPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Copyright & DMCA Policy</h1>
            <p className="text-lg text-gray-600">
              Protecting intellectual property rights while fostering creativity
            </p>
          </div>

          <div className="prose prose-lg max-w-none">
            {/* User Responsibility Section */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <Users className="w-6 h-6 mr-2 text-blue-600" />
                User Responsibility
              </h2>
              <div className="bg-blue-50 p-6 rounded-lg mb-6">
                <p className="text-blue-900 font-semibold mb-4">
                  By uploading content to SoundBridge, you confirm that:
                </p>
                <ul className="list-disc ml-6 space-y-2 text-blue-800">
                  <li>You own all rights to the music or have obtained proper licenses</li>
                  <li>The content does not infringe any third-party copyrights</li>
                  <li>You have authority to grant SoundBridge a license to host and distribute</li>
                  <li>You will not upload content that violates our community guidelines</li>
                </ul>
              </div>
            </section>

            {/* DMCA Takedown Process */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <Scale className="w-6 h-6 mr-2 text-red-600" />
                DMCA Takedown Process
              </h2>
              <div className="bg-red-50 p-6 rounded-lg mb-6">
                <p className="text-red-900 font-semibold mb-4">
                  If you believe your copyright has been infringed, send a notice to:
                </p>
                <div className="bg-white p-4 rounded border-l-4 border-red-500">
                  <p className="font-bold text-red-900 text-lg">dmca@soundbridge.live</p>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Required Information</h3>
                  <ul className="list-disc ml-4 space-y-2 text-gray-700">
                    <li>Your contact information</li>
                    <li>Description of the copyrighted work</li>
                    <li>Location of the infringing material</li>
                    <li>Good faith belief statement</li>
                    <li>Accuracy and authorization statements</li>
                    <li>Physical or electronic signature</li>
                  </ul>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Our Response</h3>
                  <ul className="list-disc ml-4 space-y-2 text-gray-700">
                    <li>Review within 24-72 hours</li>
                    <li>Remove infringing content if valid</li>
                    <li>Notify the content uploader</li>
                    <li>Provide counter-notice process</li>
                    <li>Maintain detailed records</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Three-Strike Policy */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <AlertTriangle className="w-6 h-6 mr-2 text-yellow-600" />
                Three-Strike Policy
              </h2>
              <div className="bg-yellow-50 p-6 rounded-lg border-l-4 border-yellow-400">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center font-bold mr-4">1</div>
                    <div>
                      <p className="font-bold text-yellow-900">Strike 1: Warning + Content Removed</p>
                      <p className="text-yellow-800">First offense results in content removal and warning email</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold mr-4">2</div>
                    <div>
                      <p className="font-bold text-yellow-900">Strike 2: Temporary Suspension + Content Removed</p>
                      <p className="text-yellow-800">Second offense results in 7-day account suspension</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold mr-4">3</div>
                    <div>
                      <p className="font-bold text-yellow-900">Strike 3: Permanent Ban</p>
                      <p className="text-yellow-800">Third offense results in permanent account termination</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Counter-Notice Process */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <FileText className="w-6 h-6 mr-2 text-green-600" />
                Counter-Notice Process
              </h2>
              <div className="bg-green-50 p-6 rounded-lg">
                <p className="text-green-900 font-semibold mb-4">
                  If you believe your content was wrongfully removed, you can file a counter-notice:
                </p>
                <ul className="list-disc ml-6 space-y-2 text-green-800">
                  <li>Send counter-notice to dmca@soundbridge.live</li>
                  <li>Include your contact information and signature</li>
                  <li>State that you believe the removal was a mistake</li>
                  <li>Consent to jurisdiction in your local federal court</li>
                  <li>We will restore content within 10-14 business days</li>
                </ul>
              </div>
            </section>

            {/* Automated Protection */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Automated Protection</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Detection Methods</h3>
                  <ul className="list-disc ml-4 space-y-2 text-gray-700">
                    <li>Major artist name detection</li>
                    <li>Record label identification</li>
                    <li>Suspicious keyword analysis</li>
                    <li>User history tracking</li>
                    <li>Community reporting system</li>
                  </ul>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Review Process</h3>
                  <ul className="list-disc ml-4 space-y-2 text-gray-700">
                    <li>Automated flagging for review</li>
                    <li>Manual admin review</li>
                    <li>Legal team consultation</li>
                    <li>User notification system</li>
                    <li>Appeal process available</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Contact Information */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <Mail className="w-6 h-6 mr-2 text-blue-600" />
                Contact Information
              </h2>
              <div className="bg-blue-50 p-6 rounded-lg">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">DMCA & Legal</h3>
                    <p className="text-blue-800">dmca@soundbridge.live</p>
                    <p className="text-blue-800">For copyright takedown requests</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">General Support</h3>
                    <p className="text-blue-800">contact@soundbridge.live</p>
                    <p className="text-blue-800">For general questions and support</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Legal Disclaimer */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Legal Disclaimer</h2>
              <div className="bg-gray-100 p-6 rounded-lg">
                <p className="text-gray-700 mb-4">
                  This policy is designed to comply with the Digital Millennium Copyright Act (DMCA) 
                  and other applicable copyright laws. SoundBridge respects intellectual property 
                  rights and is committed to responding to valid copyright complaints.
                </p>
                <p className="text-gray-700">
                  <strong>Important:</strong> False copyright claims may result in legal consequences. 
                  Only submit DMCA notices if you are the copyright owner or authorized to act on their behalf.
                </p>
              </div>
            </section>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Link 
                href="/dashboard" 
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors text-center"
              >
                Back to Dashboard
              </Link>
              <Link 
                href="/upload" 
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors text-center"
              >
                Upload Content
              </Link>
              <a 
                href="mailto:dmca@soundbridge.live" 
                className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors text-center"
              >
                Submit DMCA Notice
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
