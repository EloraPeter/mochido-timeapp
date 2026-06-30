// app/help/page.tsx
// Mobile-First Help & Support Page

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import MobileSidebar from '@/components/MobileSidebar';
import BottomTabBar from '@/components/BottomTabBar';
import { 
  ChevronLeft, 
  Search, 
  Mail, 
  MessageCircle, 
  BookOpen, 
  Clock, 
  Calendar, 
  CheckSquare,
  GraduationCap,
  Sun,
  Moon,
  Bell,
  Shield,
  HelpCircle,
  ChevronRight,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Send,
  X,
  Sparkles
} from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'getting-started' | 'courses' | 'tasks' | 'routines' | 'account';
}

const FAQS: FAQItem[] = [
  {
    id: '1',
    question: 'How do I get started with MochiDo?',
    answer: 'Welcome to MochiDo! 🎉 Start by exploring your dashboard. Add your courses, create tasks, and set up morning routines. The more you use MochiDo, the smarter your academic companion becomes! Check the "Getting Started" guide in your dashboard for a quick tour.',
    category: 'getting-started'
  },
  {
    id: '2',
    question: 'How do I enroll in a course?',
    answer: 'Go to Courses → Browse Courses tab. Search for your course by title or code, then click "Enroll". If you don\'t see your course, you can create it yourself! Student-created courses become verified when a lecturer claims them.',
    category: 'courses'
  },
  {
    id: '3',
    question: 'What are verified courses?',
    answer: 'Verified courses are backed by real lecturers and include assignments, grades, and official schedules. Community courses are created by students and become verified when a lecturer claims them using the same course code.',
    category: 'courses'
  },
  {
    id: '4',
    question: 'How do I create a task?',
    answer: 'Tap the + button in Tasks, or go to Tasks → Add Task. Set a title, priority (High/Medium/Low), due date, and optionally link it to a course. You can also add subtasks to break down complex assignments!',
    category: 'tasks'
  },
  {
    id: '5',
    question: 'What are routines and how do they help?',
    answer: 'Routines are daily habits that affect your wake-up time. Mark routines as "Affects wake-up" to include them in your morning preparation calculation. Mochi uses this to suggest the best time to wake up for your first class!',
    category: 'routines'
  },
  {
    id: '6',
    question: 'How does Mochi the buddy work?',
    answer: 'Mochi is your academic companion! 🐹 She tracks your progress, celebrates your wins, and gently reminds you about urgent tasks. The more tasks you complete, the happier Mochi becomes! Tap on Mochi anytime for encouragement.',
    category: 'getting-started'
  },
  {
    id: '7',
    question: 'Can I change my password or name?',
    answer: 'Yes! Go to Settings → Account Settings. You can update your name, change your password, and manage notification preferences there.',
    category: 'account'
  },
  {
    id: '8',
    question: 'How do dark mode and themes work?',
    answer: 'Toggle dark mode from the sidebar menu (tap the hamburger icon ☰). Dark mode reduces eye strain during late-night study sessions. Your preference is saved automatically!',
    category: 'account'
  },
  {
    id: '9',
    question: 'What happens when I drop a course?',
    answer: 'Dropping a course removes it from your schedule and hides all associated assignments. Your progress data is preserved in case you re-enroll later.',
    category: 'courses'
  },
  {
    id: '10',
    question: 'How do notifications work?',
    answer: 'MochiDo sends reminders for upcoming assignments, overdue tasks, and daily routines. You can customize notification settings in Settings → Notifications.',
    category: 'account'
  }
];

const CATEGORIES = [
  { id: 'all', label: 'All', icon: <HelpCircle size={16} /> },
  { id: 'getting-started', label: 'Getting Started', icon: <Sparkles size={16} /> },
  { id: 'courses', label: 'Courses', icon: <GraduationCap size={16} /> },
  { id: 'tasks', label: 'Tasks', icon: <CheckSquare size={16} /> },
  { id: 'routines', label: 'Routines', icon: <Clock size={16} /> },
  { id: 'account', label: 'Account', icon: <Shield size={16} /> }
];

export default function HelpPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    message: '',
    type: 'question'
  });
  const [helpfulFeedback, setHelpfulFeedback] = useState<Record<string, boolean>>({});

  // Filter FAQs based on search and category
  const filteredFaqs = FAQS.filter(faq => {
    const matchesSearch = searchTerm === '' || 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, send to your backend or email service
    console.log('Contact form submitted:', contactForm);
    setFeedbackSubmitted(true);
    setTimeout(() => {
      setShowContactForm(false);
      setFeedbackSubmitted(false);
      setContactForm({ name: '', email: '', message: '', type: 'question' });
    }, 2000);
  };

  const handleHelpful = (faqId: string, helpful: boolean) => {
    setHelpfulFeedback(prev => ({ ...prev, [faqId]: helpful }));
    // In a real app, send this feedback to your analytics
    console.log(`FAQ ${faqId} was ${helpful ? 'helpful' : 'not helpful'}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16">
      <MobileSidebar />
      <BottomTabBar />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 px-4 pt-12 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full active:bg-gray-100 dark:active:bg-gray-800 transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft size={22} className="text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Help & Support</h1>
            <p className="text-xs text-gray-500">Get answers and assistance</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5 max-w-lg mx-auto">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search for help..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Category Filter - Horizontal scrollable */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {CATEGORIES.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all active:scale-95 ${
                selectedCategory === category.id
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
              }`}
            >
              {category.icon}
              {category.label}
            </button>
          ))}
        </div>

        {/* Contact Support Button */}
        <button
          onClick={() => setShowContactForm(true)}
          className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl shadow-md active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <MessageCircle size={20} />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm">Contact Support</p>
              <p className="text-xs opacity-90">Get help from our team</p>
            </div>
          </div>
          <ChevronRight size={20} className="opacity-80" />
        </button>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 text-center shadow-sm">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <BookOpen size={18} className="text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{FAQS.length}</p>
            <p className="text-xs text-gray-500">Help Articles</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 text-center shadow-sm">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <Clock size={18} className="text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">24/7</p>
            <p className="text-xs text-gray-500">Support Available</p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">Frequently Asked Questions</h2>
            <p className="text-xs text-gray-400">{filteredFaqs.length} articles found</p>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredFaqs.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search size={24} className="text-gray-400" />
                </div>
                <p className="text-gray-400 font-medium">No results found</p>
                <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
              </div>
            ) : (
              filteredFaqs.map(faq => (
                <div key={faq.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                    className="w-full p-4 text-left flex items-center justify-between gap-3 active:bg-gray-50 dark:active:bg-gray-700/30 transition-colors"
                  >
                    <span className="font-medium text-gray-900 dark:text-white text-sm flex-1">
                      {faq.question}
                    </span>
                    <ChevronRight 
                      size={18} 
                      className={`text-gray-400 transition-transform flex-shrink-0 ${
                        expandedFaq === faq.id ? 'rotate-90' : ''
                      }`}
                    />
                  </button>
                  
                  <AnimatePresence>
                    {expandedFaq === faq.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 pb-4"
                      >
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                          {faq.answer}
                        </p>
                        
                        {/* Helpful feedback buttons */}
                        <div className="flex items-center gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                          <span className="text-xs text-gray-400">Was this helpful?</span>
                          <button
                            onClick={() => handleHelpful(faq.id, true)}
                            className={`flex items-center gap-1 text-xs transition-colors ${
                              helpfulFeedback[faq.id] === true 
                                ? 'text-green-500' 
                                : 'text-gray-400 hover:text-green-500'
                            }`}
                          >
                            <ThumbsUp size={14} />
                            Yes
                          </button>
                          <button
                            onClick={() => handleHelpful(faq.id, false)}
                            className={`flex items-center gap-1 text-xs transition-colors ${
                              helpfulFeedback[faq.id] === false 
                                ? 'text-red-500' 
                                : 'text-gray-400 hover:text-red-500'
                            }`}
                          >
                            <ThumbsDown size={14} />
                            No
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Tips Card */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🐹💡</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Quick Tips</p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 mt-2 space-y-1.5">
                <li className="flex items-center gap-2">
                  <Sparkles size={12} className="text-purple-500" />
                  Tap Mochi anytime for encouragement!
                </li>
                <li className="flex items-center gap-2">
                  <Bell size={12} className="text-blue-500" />
                  Enable notifications to never miss deadlines
                </li>
                <li className="flex items-center gap-2">
                  <GraduationCap size={12} className="text-green-500" />
                  Create study groups by sharing course codes
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Support Bottom Sheet */}
      <AnimatePresence>
        {showContactForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-end justify-center z-50"
            onClick={() => setShowContactForm(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-gray-800 rounded-t-3xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <MessageCircle size={20} className="text-blue-500" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Contact Support</h2>
                </div>
                <button onClick={() => setShowContactForm(false)} className="p-2 -mr-2 active:bg-gray-100 dark:active:bg-gray-700 rounded-full">
                  <X size={22} className="text-gray-500" />
                </button>
              </div>

              {feedbackSubmitted ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Send size={24} className="text-green-500" />
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white">Message Sent!</p>
                  <p className="text-sm text-gray-500 mt-1">We'll get back to you within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">What can we help with?</label>
                    <select
                      value={contactForm.type}
                      onChange={(e) => setContactForm({ ...contactForm, type: e.target.value })}
                      className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                    >
                      <option value="question">Question</option>
                      <option value="bug">Bug Report</option>
                      <option value="feature">Feature Request</option>
                      <option value="account">Account Issue</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Your Name</label>
                    <input
                      type="text"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Email Address</label>
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Message</label>
                    <textarea
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      rows={4}
                      className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                      placeholder="Describe your issue or question in detail..."
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowContactForm(false)}
                      className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium active:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium shadow-md active:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Send size={16} />
                      Send Message
                    </button>
                  </div>
                </form>
              )}

              <div className="h-2" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}