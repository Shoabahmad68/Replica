// src/pages/HelpSupport.jsx
import React, { useState } from "react";
import {
  LifeBuoy, Mail, Phone, MessageCircle, FileText, Video,
  ChevronDown, ChevronUp, Send, CheckCircle, ExternalLink,
  Search, AlertCircle
} from "lucide-react";

export default function HelpSupport() {
  // --- STATE MANAGEMENT ---
  const [activeFAQ, setActiveFAQ] = useState(null);
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [ticketSent, setTicketSent] = useState(false);

  // --- HANDLERS ---
  const toggleFAQ = (index) => {
    setActiveFAQ(activeFAQ === index ? null : index);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;

    setSending(true);
    // Simulate Backend API Call
    setTimeout(() => {
      setSending(false);
      setTicketSent(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setTicketSent(false), 5000);
    }, 1500);
  };

  // --- DATA: FAQS ---
  const faqs = [
    {
      q: "How often does the data sync with Tally?",
      a: "Data sync frequency depends on your settings. By default, it auto-syncs every 2 hours. You can also trigger a 'Manual Sync' from the Analyst Dashboard anytime."
    },
    {
      q: "Why can't I see the latest invoices?",
      a: "Please check if the 'Tally Connector' is running on your server. Also, try clearing the application cache from Settings > Advanced > Clear Cache."
    },
    {
      q: "How do I add a new Salesman user?",
      a: "Go to Settings > User & Role Management. You can invite a new user via email and assign them the 'Salesman' role. They will receive login credentials via email."
    },
    {
      q: "Is my data secure?",
      a: "Yes, we use end-to-end encryption for data transfer. You can also enable Two-Factor Authentication (2FA) in Settings > Security for extra protection."
    },
    {
      q: "Can I export reports to PDF?",
      a: "Absolutely! Every report page (Sales, Outstanding, Hierarchy) has an 'Export' button at the top right corner supporting both PDF and Excel formats."
    }
  ];

  return (
    <div className="p-4 md:p-6 min-h-screen bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] text-gray-200 font-sans pb-20">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER HERO SECTION */}
        <div className="bg-[#1B2A4A] rounded-2xl p-8 border border-[#223355] shadow-2xl text-center relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-[#64FFDA] to-blue-500"></div>
           <LifeBuoy size={64} className="mx-auto text-[#64FFDA] mb-4 animate-bounce-slow" />
           <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">How can we help you today?</h1>
           <p className="text-gray-400 max-w-2xl mx-auto">
             Search our knowledge base, explore FAQs, or get in touch with our support team directly.
           </p>
           
           {/* Search Bar (Visual Only) */}
           <div className="mt-6 max-w-lg mx-auto relative">
             <Search className="absolute left-3 top-3 text-gray-500" size={20} />
             <input 
               type="text" 
               placeholder="Search for answers (e.g., 'Tally Sync', 'Invoice')..." 
               className="w-full bg-[#0A192F] border border-[#223355] rounded-full py-3 pl-10 pr-4 text-white focus:border-[#64FFDA] outline-none shadow-inner"
             />
           </div>
        </div>

        {/* QUICK CONTACT CARDS */}
        <div className="grid md:grid-cols-3 gap-6">
          <ContactCard 
            icon={<Phone size={24} />} 
            title="Call Support" 
            info="+91 98765 43210" 
            sub="Mon-Fri, 10am - 7pm"
            action="Call Now"
            link="tel:+919876543210"
            color="text-blue-400"
          />
          <ContactCard 
            icon={<Mail size={24} />} 
            title="Email Us" 
            info="support@sel-t.com" 
            sub="Response within 24 hours"
            action="Send Email"
            link="mailto:support@sel-t.com"
            color="text-green-400"
          />
          <ContactCard 
            icon={<MessageCircle size={24} />} 
            title="WhatsApp Chat" 
            info="Live Chat Support" 
            sub="Available 24/7 for urgent issues"
            action="Chat Now"
            link="https://wa.me/919876543210"
            color="text-[#25D366]"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: FAQs & RESOURCES */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* FAQ SECTION */}
            <div className="bg-[#1B2A4A] rounded-2xl p-6 border border-[#223355] shadow-lg">
              <h2 className="text-xl font-bold text-[#64FFDA] mb-6 flex items-center gap-2">
                <AlertCircle size={20} /> Frequently Asked Questions
              </h2>
              <div className="space-y-3">
                {faqs.map((item, index) => (
                  <div key={index} className="border border-[#223355] rounded-lg bg-[#0D1B34] overflow-hidden transition-all">
                    <button 
                      onClick={() => toggleFAQ(index)}
                      className="w-full flex justify-between items-center p-4 text-left hover:bg-[#112240] transition"
                    >
                      <span className="font-semibold text-gray-200">{item.q}</span>
                      {activeFAQ === index ? <ChevronUp size={20} className="text-[#64FFDA]" /> : <ChevronDown size={20} className="text-gray-500" />}
                    </button>
                    {activeFAQ === index && (
                      <div className="p-4 pt-0 text-gray-400 text-sm border-t border-[#223355] bg-[#0A192F]">
                        <p className="mt-3">{item.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* DOCUMENTATION LINKS */}
            <div className="grid sm:grid-cols-2 gap-4">
               <DocCard icon={<FileText />} title="User Manual" desc="Comprehensive guide for all features." />
               <DocCard icon={<Video />} title="Video Tutorials" desc="Step-by-step video walkthroughs." />
            </div>

          </div>

          {/* RIGHT COLUMN: CONTACT FORM */}
          <div className="lg:col-span-1">
            <div className="bg-[#1B2A4A] rounded-2xl p-6 border border-[#223355] shadow-lg sticky top-6">
               <h2 className="text-xl font-bold text-[#64FFDA] mb-2">Raise a Ticket</h2>
               <p className="text-gray-400 text-sm mb-6">Facing an issue? Fill out the form below and our tech team will resolve it.</p>

               {ticketSent ? (
                 <div className="bg-green-500/20 border border-green-500 rounded-xl p-6 text-center animate-fadeIn">
                    <CheckCircle size={48} className="mx-auto text-green-500 mb-3" />
                    <h3 className="text-green-400 font-bold text-lg">Ticket #2938 Created!</h3>
                    <p className="text-gray-300 text-sm mt-2">We have received your request. Check your email for updates.</p>
                    <button onClick={() => setTicketSent(false)} className="mt-4 text-xs text-[#64FFDA] underline">Send another message</button>
                 </div>
               ) : (
                 <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Your Name</label>
                      <input 
                        type="text" name="name" required
                        value={formData.name} onChange={handleInputChange}
                        className="w-full bg-[#0D1B34] border border-[#223355] rounded-lg p-3 text-white text-sm focus:border-[#64FFDA] outline-none"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Email Address</label>
                      <input 
                        type="email" name="email" required
                        value={formData.email} onChange={handleInputChange}
                        className="w-full bg-[#0D1B34] border border-[#223355] rounded-lg p-3 text-white text-sm focus:border-[#64FFDA] outline-none"
                        placeholder="john@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Subject</label>
                      <select 
                        name="subject"
                        value={formData.subject} onChange={handleInputChange}
                        className="w-full bg-[#0D1B34] border border-[#223355] rounded-lg p-3 text-white text-sm focus:border-[#64FFDA] outline-none"
                      >
                        <option value="">Select Issue Type</option>
                        <option value="Technical Bug">Technical Bug</option>
                        <option value="Data Sync Issue">Data Sync Issue</option>
                        <option value="Feature Request">Feature Request</option>
                        <option value="Billing">Billing & Account</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Message</label>
                      <textarea 
                        name="message" required
                        value={formData.message} onChange={handleInputChange}
                        className="w-full h-32 bg-[#0D1B34] border border-[#223355] rounded-lg p-3 text-white text-sm focus:border-[#64FFDA] outline-none resize-none"
                        placeholder="Describe your issue in detail..."
                      />
                    </div>
                    
                    <button 
                      type="submit" 
                      disabled={sending}
                      className="w-full bg-[#64FFDA] hover:bg-[#52e0c2] text-[#0A192F] font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? "Sending..." : <>Send Message <Send size={18} /></>}
                    </button>
                 </form>
               )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/* --- REUSABLE COMPONENTS --- */

function ContactCard({ icon, title, info, sub, action, link, color }) {
  return (
    <div className="bg-[#1B2A4A] p-6 rounded-xl border border-[#223355] shadow-lg hover:border-[#64FFDA]/30 transition group">
      <div className={`w-12 h-12 rounded-full bg-[#0D1B34] flex items-center justify-center mb-4 ${color} group-hover:scale-110 transition`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
      <p className="text-xl font-semibold text-[#64FFDA] mb-1">{info}</p>
      <p className="text-gray-500 text-xs mb-4">{sub}</p>
      <a 
        href={link} target="_blank" rel="noreferrer"
        className="text-sm font-semibold text-white border-b border-[#64FFDA] pb-0.5 hover:text-[#64FFDA] transition"
      >
        {action} &rarr;
      </a>
    </div>
  );
}

function DocCard({ icon, title, desc }) {
  return (
    <a href="#" className="flex items-center gap-4 bg-[#1B2A4A] p-4 rounded-xl border border-[#223355] hover:bg-[#15233b] hover:border-[#64FFDA] transition cursor-pointer group">
      <div className="p-3 bg-[#0D1B34] rounded-lg text-[#64FFDA] group-hover:bg-[#64FFDA] group-hover:text-[#0A192F] transition">
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-white">{title}</h4>
        <p className="text-xs text-gray-400">{desc}</p>
      </div>
      <ExternalLink size={16} className="ml-auto text-gray-500 group-hover:text-white" />
    </a>
  );
}
