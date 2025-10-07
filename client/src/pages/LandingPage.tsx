import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Bot,
  MessageSquare,
  Users,
  BarChart3,
  Globe,
  Palette,
  Clock,
  Sparkles,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  Check,
  Star,
  Zap,
  Shield,
  Menu,
  X,
  ArrowUp,
  MessageCircle,
  Headphones,
  TrendingUp,
  Brain,
  Layers,
  Code
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";

export default function LandingPage() {
  const { toast } = useToast();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: ""
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setMobileMenuOpen(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message sent!",
      description: "We'll get back to you within 24 hours.",
    });
    setFormData({ name: "", email: "", company: "", message: "" });
  };

  const features = [
    {
      icon: MessageSquare,
      title: "Lead Generation",
      description: "Automatically capture visitor information and grow your customer base",
      color: "text-blue-500"
    },
    {
      icon: Palette,
      title: "Customizable Themes",
      description: "Choose from 5 modern design themes to match your brand",
      color: "text-purple-500"
    },
    {
      icon: Brain,
      title: "Smart AI Responses",
      description: "AI-powered conversations with clickable response options",
      color: "text-green-500"
    },
    {
      icon: Layers,
      title: "Dual Widget Modes",
      description: "Floating bubble or fullpage embedding for any website",
      color: "text-orange-500"
    },
    {
      icon: Clock,
      title: "Business Hours",
      description: "Set availability schedules and custom offline messages",
      color: "text-red-500"
    },
    {
      icon: BarChart3,
      title: "Real-time Analytics",
      description: "Track conversations, leads, and chatbot performance",
      color: "text-indigo-500"
    },
    {
      icon: Code,
      title: "Easy Integration",
      description: "Simple embed code works on any website in seconds",
      color: "text-pink-500"
    },
    {
      icon: Globe,
      title: "Multi-language",
      description: "Reach a global audience with multilingual support",
      color: "text-teal-500"
    }
  ];

  const benefits = [
    { icon: Clock, text: "24/7 Customer Support without hiring staff" },
    { icon: TrendingUp, text: "Increase conversion rates by up to 3x" },
    { icon: Headphones, text: "Reduce support ticket volume by 60%" },
    { icon: Users, text: "Capture leads while you sleep" },
    { icon: Zap, text: "Instant answers to customer questions" },
    { icon: Sparkles, text: "Professional appearance with custom branding" }
  ];

  const steps = [
    {
      number: "01",
      title: "Create Your Chatbot",
      description: "Set up your chatbot with custom settings and branding in minutes",
      icon: Bot
    },
    {
      number: "02",
      title: "Train Your AI",
      description: "Add your business information, FAQs, and response templates",
      icon: Brain
    },
    {
      number: "03",
      title: "Embed on Website",
      description: "Copy and paste one line of code to add the chatbot to your site",
      icon: Code
    },
    {
      number: "04",
      title: "Watch Leads Roll In",
      description: "Monitor conversations and collect leads automatically",
      icon: BarChart3
    }
  ];

  const pricingPlans = [
    {
      name: "Free Trial",
      price: "$0",
      duration: "7 days",
      features: ["Full features", "No credit card required", "1 chatbot", "100 conversations"],
      highlighted: false
    },
    {
      name: "Starter",
      price: "$29",
      duration: "/month",
      features: ["1 chatbot", "1,000 conversations/mo", "Lead capture", "Email support"],
      highlighted: false
    },
    {
      name: "Professional",
      price: "$79",
      duration: "/month",
      features: ["5 chatbots", "Unlimited conversations", "Priority support", "Advanced analytics"],
      highlighted: true,
      badge: "Most Popular"
    },
    {
      name: "Enterprise",
      price: "Custom",
      duration: "pricing",
      features: ["Unlimited chatbots", "Custom integrations", "Dedicated support", "SLA guarantee"],
      highlighted: false
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-background/95 backdrop-blur-md border-b border-border" : "bg-transparent"
      }`} data-testid="nav-main">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <Bot className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">ChatbotSaaS</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => scrollToSection("features")}
                className="text-sm hover:text-primary transition-colors"
                data-testid="nav-features"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection("how-it-works")}
                className="text-sm hover:text-primary transition-colors"
                data-testid="nav-how-it-works"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection("pricing")}
                className="text-sm hover:text-primary transition-colors"
                data-testid="nav-pricing"
              >
                Pricing
              </button>
              <button
                onClick={() => scrollToSection("contact")}
                className="text-sm hover:text-primary transition-colors"
                data-testid="nav-contact"
              >
                Contact
              </button>
              <Link href="/admin/login">
                <Button variant="outline" size="sm" data-testid="button-login">
                  Login
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-border animate-slideUp">
              <div className="flex flex-col space-y-4">
                <button
                  onClick={() => scrollToSection("features")}
                  className="text-sm hover:text-primary transition-colors text-left"
                  data-testid="mobile-nav-features"
                >
                  Features
                </button>
                <button
                  onClick={() => scrollToSection("how-it-works")}
                  className="text-sm hover:text-primary transition-colors text-left"
                  data-testid="mobile-nav-how-it-works"
                >
                  How It Works
                </button>
                <button
                  onClick={() => scrollToSection("pricing")}
                  className="text-sm hover:text-primary transition-colors text-left"
                  data-testid="mobile-nav-pricing"
                >
                  Pricing
                </button>
                <button
                  onClick={() => scrollToSection("contact")}
                  className="text-sm hover:text-primary transition-colors text-left"
                  data-testid="mobile-nav-contact"
                >
                  Contact
                </button>
                <Link href="/admin/login">
                  <Button variant="outline" size="sm" className="w-full" data-testid="mobile-button-login">
                    Login
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 pt-20 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
          <div className="absolute inset-0 wave-pattern opacity-10"></div>
        </div>
        
        <div className="container mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto animate-fadeIn">
            <Badge className="mb-4" variant="secondary">
              <Sparkles className="w-3 h-3 mr-1" />
              Trusted by 10,000+ businesses
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              AI Chatbots That Convert Visitors Into Customers
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Create intelligent chatbots in minutes. No coding required. 
              Capture leads, answer questions, and boost conversions 24/7.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button size="lg" className="group" data-testid="button-get-started">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => scrollToSection("contact")}
                data-testid="button-schedule-demo"
              >
                Schedule Demo
              </Button>
            </div>

            {/* Chatbot Preview */}
            <div className="relative max-w-2xl mx-auto">
              <div className="glass-effect rounded-lg p-6 animate-pulse">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <Bot className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-card rounded-lg p-4">
                      <p className="text-sm">Hi! How can I help you today? 👋</p>
                      <div className="mt-3 flex gap-2">
                        <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
                          Learn about pricing
                        </Badge>
                        <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
                          Book a demo
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 relative">
        <div className="absolute inset-0 wave-pattern opacity-5"></div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-12 animate-fadeIn">
            <Badge className="mb-4">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Engage Customers
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to help you capture leads and provide instant support
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="group hover:scale-105 transition-all duration-300 cursor-pointer"
                style={{ animationDelay: `${index * 0.1}s` }}
                data-testid={`card-feature-${index}`}
              >
                <CardHeader>
                  <feature.icon className={`h-10 w-10 ${feature.color} mb-3`} />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4">Benefits</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Businesses Choose Our Platform
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-start space-x-4 animate-slideUp"
                style={{ animationDelay: `${index * 0.1}s` }}
                data-testid={`text-benefit-${index}`}
              >
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <benefit.icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <p className="text-lg">{benefit.text}</p>
              </div>
            ))}
          </div>

          {/* Statistics */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto text-center">
            <div className="space-y-2" data-testid="stat-chatbots">
              <div className="text-4xl font-bold text-primary">10,000+</div>
              <p className="text-muted-foreground">Chatbots Created</p>
            </div>
            <div className="space-y-2" data-testid="stat-conversations">
              <div className="text-4xl font-bold text-primary">1M+</div>
              <p className="text-muted-foreground">Conversations</p>
            </div>
            <div className="space-y-2" data-testid="stat-rating">
              <div className="text-4xl font-bold text-primary">4.9/5</div>
              <div className="flex justify-center">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4">How It Works</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Get Started in 4 Simple Steps
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Launch your AI chatbot in minutes, not months
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div
                key={index}
                className="relative animate-fadeIn"
                style={{ animationDelay: `${index * 0.15}s` }}
                data-testid={`step-${index}`}
              >
                <div className="text-center">
                  <div className="relative mb-4">
                    <div className="text-6xl font-bold text-primary/20">{step.number}</div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                        <step.icon className="w-8 h-8 text-primary-foreground" />
                      </div>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <ChevronRight className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-gradient-to-b from-background to-primary/5">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4">Pricing</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              All plans include lead capture, analytics, and support
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card
                key={index}
                className={`relative ${plan.highlighted ? "border-primary scale-105" : ""}`}
                data-testid={`card-pricing-${index}`}
              >
                {plan.badge && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    {plan.badge}
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.duration}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <Check className="w-5 h-5 text-primary mr-2 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full mt-6 ${plan.highlighted ? "" : "variant-outline"}`}
                    variant={plan.highlighted ? "default" : "outline"}
                    data-testid={`button-select-plan-${index}`}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4">Contact</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Transform Your Customer Engagement?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Get in touch with our team for a personalized demo
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Contact Options */}
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <Mail className="w-10 h-10 text-primary" />
                    <div>
                      <h3 className="font-semibold">Email Us</h3>
                      <a
                        href="mailto:support@chatbotsaas.com"
                        className="text-primary hover:underline"
                        data-testid="link-email"
                      >
                        support@chatbotsaas.com
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <SiWhatsapp className="w-10 h-10 text-green-500" />
                    <div>
                      <h3 className="font-semibold">WhatsApp</h3>
                      <a
                        href="https://wa.me/1234567890?text=Hi,%20I'm%20interested%20in%20your%20chatbot%20solution"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                        data-testid="link-whatsapp"
                      >
                        Chat on WhatsApp
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Quick Response Time</h3>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Check className="w-5 h-5 text-primary" />
                        <span>Email response within 24 hours</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Check className="w-5 h-5 text-primary" />
                        <span>WhatsApp instant messaging</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Check className="w-5 h-5 text-primary" />
                        <span>Demo scheduling available</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contact Form */}
            <Card>
              <CardHeader>
                <CardTitle>Send us a message</CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you soon
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Name</label>
                    <Input
                      type="text"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      data-testid="input-name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Email</label>
                    <Input
                      type="email"
                      placeholder="john@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      data-testid="input-email"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Company</label>
                    <Input
                      type="text"
                      placeholder="Company Inc."
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      data-testid="input-company"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Message</label>
                    <Textarea
                      placeholder="Tell us about your needs..."
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      data-testid="input-message"
                    />
                  </div>
                  <Button type="submit" className="w-full" data-testid="button-submit-form">
                    Send Message
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Bot className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">ChatbotSaaS</span>
              </div>
              <p className="text-muted-foreground">
                Transform your customer engagement with AI-powered chatbots
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => scrollToSection("features")}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    data-testid="footer-link-features"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("pricing")}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    data-testid="footer-link-pricing"
                  >
                    Pricing
                  </button>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    Documentation
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("contact")}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    data-testid="footer-link-contact"
                  >
                    Contact
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    API Docs
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    Status
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-border text-center text-muted-foreground">
            <p>&copy; 2024 ChatbotSaaS. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/1234567890?text=Hi,%20I'm%20interested%20in%20your%20chatbot%20solution"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110"
        data-testid="button-whatsapp-float"
      >
        <SiWhatsapp className="w-6 h-6" />
      </a>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 left-6 z-40 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-3 shadow-lg transition-all hover:scale-110"
          data-testid="button-scroll-top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}