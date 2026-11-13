import React from 'react';
import MainLayout from '../../../components/layout/MainLayout.jsx';
import {
  ExternalLink,
  ShieldCheck,
  Utensils,
  Heart,
  Scale,
  Sprout,
  Users,
  Award,
  CheckCircle,
  FileText,
  Info,
} from 'lucide-react';

function GovernmentSchemesPage() {
  const schemes = [
    {
      id: 'pm-poshan',
      tag: 'Flagship Core Scheme',
      title: 'PM POSHAN (Pradhan Mantri Poshan Shakti Nirman)',
      subtitle: 'Centrally Sponsored Scheme for School Meals',
      ministry: 'Ministry of Education, Government of India',
      bannerColor: 'from-emerald-600 to-teal-700',
      tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      description:
        'PM POSHAN covers all school children studying in Balvatika and Classes I-VIII in Government and Government-Aided Schools. It provides one hot cooked meal on all school working days to enhance attendance, enrollment, and child nutritional status.',
      targets: [
        { label: 'Primary (Classes I–V)', value: '450 Calories & 12g Protein', icon: Utensils },
        { label: 'Upper Primary (Classes VI–VIII)', value: '700 Calories & 20g Protein', icon: Scale },
        { label: 'Foodgrain Entitlement', value: '100g (Primary) / 150g (Upper Primary)', icon: Sprout },
      ],
      objectives: [
        'Improve nutritional levels of children in elementary classes across India.',
        'Encourage poor children, belonging to disadvantaged sections, to attend school regularly.',
        'Address classroom hunger and support child cognitive development and growth.',
        'Promote social integration and gender equity through community meal programs.',
      ],
      officialUrl: 'https://pmposhan.education.gov.in/',
      referenceDoc: 'PM POSHAN Operational Guidelines 2021',
    },
    {
      id: 'poshan-abhiyaan',
      tag: 'National Nutrition Mission',
      title: 'POSHAN Abhiyaan (National Nutrition Mission)',
      subtitle: 'Holistic Multi-Ministerial Nutrition Initiative',
      ministry: 'Ministry of Women and Child Development',
      bannerColor: 'from-indigo-600 to-blue-700',
      tagColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      description:
        'Launched to achieve improvement in nutritional status of children (0-6 years), adolescent girls, pregnant women and lactating mothers in a time-bound manner with targeted reductions in stunting, under-nutrition, anemia, and low birth weight.',
      targets: [
        { label: 'Target Demographic', value: 'Children (0-6y), Adolescent Girls, Mothers', icon: Users },
        { label: 'Stunting Reduction Target', value: '2% per annum reduction nationwide', icon: Award },
        { label: 'Key Pillars', value: 'Convergence, Technology & Jan Andolan', icon: Heart },
      ],
      objectives: [
        'Prevent and reduce stunting and under-nutrition among children.',
        'Reduce prevalence of anemia among young children, women, and adolescent girls.',
        'Harness real-time digital monitoring and ICT-based child tracking.',
        'Mobilize community participation through Poshan Pakhwada and Poshan Maah.',
      ],
      officialUrl: 'https://www.wcd.gov.in/pregnant-lactating-women-children/poshan--abhiyaan',
      referenceDoc: 'POSHAN Abhiyaan Framework for Implementation',
    },
    {
      id: 'poshan-2-0',
      tag: 'Strategic Framework',
      title: 'Mission Saksham Anganwadi & POSHAN 2.0',
      subtitle: 'Integrated Nutrition Support Program',
      ministry: 'Ministry of Women and Child Development',
      bannerColor: 'from-amber-600 to-orange-700',
      tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      description:
        'An umbrella scheme that synergizes the Supplementary Nutrition Programme and POSHAN Abhiyaan. Focuses on disease resistance, wellness, traditional food systems, millets promotion, and AYUSH-based nutritional wisdom.',
      targets: [
        { label: 'Focus Area', value: 'Maternal Nutrition & Infant Wellness', icon: Heart },
        { label: 'Dietary Diversity', value: 'Millet & Coarse Grains Inclusion', icon: Sprout },
        { label: 'Delivery Model', value: 'Modernized Saksham Anganwadi Centers', icon: ShieldCheck },
      ],
      objectives: [
        'Address malnutrition challenges via comprehensive lifecycle continuum approach.',
        'Promote consumption of millets (Shree Anna) and unpolished local traditional grains.',
        'Strengthen quality, testing, and delivery protocols of supplementary foods.',
        'Integrate AYUSH practices for holistic wellness and digestive health.',
      ],
      officialUrl: 'https://www.wcd.gov.in/offerings/nutrition-mission-saksham-anganwadi-and-poshan-2-0-mission-saksham-anganwadi-poshan-2-0',
      referenceDoc: 'POSHAN 2.0 Program Guidelines',
    },
    {
      id: 'rbsk',
      tag: 'Screening & Intervention',
      title: 'Rashtriya Bal Swasthya Karyakram (RBSK)',
      subtitle: 'Child Health Screening and Early Intervention Services',
      ministry: 'Ministry of Health and Family Welfare (National Health Mission)',
      bannerColor: 'from-rose-600 to-pink-700',
      tagColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      description:
        'A national program aimed at early identification and early intervention for children from birth to 18 years to cover 4 ‘D’s: Defects at birth, Deficiencies, Diseases, and Development delays including disability.',
      targets: [
        { label: 'Coverage', value: '0-18 Years (Anganwadi + Govt School Students)', icon: Users },
        { label: 'Scope', value: '30 Identified Health Conditions / Deficiencies', icon: ShieldCheck },
        { label: 'Intervention', value: 'Free tertiary healthcare & surgical support', icon: Heart },
      ],
      objectives: [
        'Screen all students in government schools at least once a year by Mobile Health Teams.',
        'Detect severe acute malnutrition (SAM), anemia, goiter, and micronutrient deficiencies.',
        'Provide seamless referral to District Early Intervention Centres (DEIC).',
        'Improve child survival, educational attendance, and quality of life.',
      ],
      officialUrl: 'https://nhm.gov.in/index1.php?lang=1&level=2&sublinkid=818&lid=221',
      referenceDoc: 'RBSK Operational Framework, MoHFW',
    },
    {
      id: 'vatika-tithi',
      tag: 'Community & Grassroots',
      title: 'School Nutrition Gardens (Poshan Vatikas) & Tithi Bhojan',
      subtitle: 'Community Participation & Micro-Farming in Schools',
      ministry: 'PM POSHAN Grassroots Initiative',
      bannerColor: 'from-emerald-700 to-green-800',
      tagColor: 'bg-green-500/20 text-green-300 border-green-500/40',
      description:
        'School Nutrition Gardens encourage schools with available land to cultivate organic vegetables, herbs, and fruits to supplement school meals with fresh micronutrients. Tithi Bhojan promotes community participation by inviting local citizens to celebrate festivals, birthdays, and special occasions by sponsoring wholesome meals.',
      targets: [
        { label: 'Nutritional Focus', value: 'Fresh Vitamin A, C, Iron & Dietary Fiber', icon: Sprout },
        { label: 'Community Model', value: 'Voluntary civic contribution (Tithi Bhojan)', icon: Users },
        { label: 'Pedagogical Benefit', value: 'Agricultural & nature awareness for pupils', icon: Award },
      ],
      objectives: [
        'Provide fresh and chemical-free vegetables and leafy greens for mid-day meals.',
        'Enhance dietary diversity with native seasonal greens, drumstick, and fruits.',
        'Instill farming skills, environmental stewardship, and nutrition knowledge in students.',
        'Strengthen community ownership and transparency in school midday meal implementation.',
      ],
      officialUrl: 'https://pmposhan.education.gov.in/',
      referenceDoc: 'Guidelines for Setting Up School Nutrition Gardens, MoE',
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Page Title & Context Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
                <ShieldCheck size={14} /> National Nutrition Architecture
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Government Nutritional Initiatives
              </h1>
              <p className="text-slate-400 text-sm mt-1.5 max-w-3xl leading-relaxed">
                Santulita aligns institutional meal tracking, pediatric screening, and AI dietary recommendations with the statutory guidelines and calorie-protein norms formulated by the Government of India and ICMR-NIN.
              </p>
            </div>

            {/* Statutory Compliance Badge */}
            <div className="flex-shrink-0 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">PM POSHAN Standard</p>
              <p className="text-xl font-bold text-emerald-400 mt-1">450 / 700 kcal</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Primary / Upper Primary</p>
            </div>
          </div>

          {/* Quick Notice */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-400">
            <Info size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Statutory Note:</strong> Santulita operates as an automated institutional monitoring system. All referenced schemes are managed by their respective government ministries. External links redirect to official government portals.
            </span>
          </div>
        </div>

        {/* Schemes Cards Grid */}
        <div className="space-y-6">
          {schemes.map((scheme) => (
            <div
              key={scheme.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden hover:border-slate-700 transition-all duration-200 shadow-xl"
            >
              {/* Card Banner Header */}
              <div className={`bg-gradient-to-r ${scheme.bannerColor} px-6 py-4 flex flex-wrap items-center justify-between gap-3 text-white`}>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${scheme.tagColor}`}>
                    {scheme.tag}
                  </span>
                  <span className="text-xs text-white/80 font-medium">
                    {scheme.ministry}
                  </span>
                </div>

                <a
                  href={scheme.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm transition-colors"
                >
                  <span>Official Portal</span>
                  <ExternalLink size={13} />
                </a>
              </div>

              {/* Card Body */}
              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">{scheme.title}</h2>
                  <p className="text-sm font-medium text-emerald-400/90 mt-0.5">{scheme.subtitle}</p>
                  <p className="text-sm text-slate-300 mt-3 leading-relaxed">{scheme.description}</p>
                </div>

                {/* Key Norms & Targets */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Statutory Targets & Key Norms
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {scheme.targets.map((tgt, idx) => {
                      const Icon = tgt.icon;
                      return (
                        <div
                          key={idx}
                          className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex items-start gap-3"
                        >
                          <div className="p-2 rounded-xl bg-slate-900 text-emerald-400 border border-slate-800 flex-shrink-0">
                            <Icon size={18} />
                          </div>
                          <div>
                            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{tgt.label}</p>
                            <p className="text-sm font-semibold text-white mt-0.5">{tgt.value}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Key Objectives */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Key Objectives & Guidelines
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {scheme.objectives.map((obj, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                        <CheckCircle size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{obj}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reference footer */}
                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <FileText size={14} /> Ref: {scheme.referenceDoc}
                  </span>
                  <a
                    href={scheme.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1 transition-colors"
                  >
                    View Official Guidelines <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}

export default GovernmentSchemesPage;