import { useState } from 'react';
import { WelcomePage } from '@/components/WelcomePage';
import { Dashboard } from '@/components/Dashboard';
import { motion } from 'framer-motion';
import { Leaf } from 'lucide-react';

const Index = () => {
  const [showDashboard, setShowDashboard] = useState(false);

  if (!showDashboard) {
    return <WelcomePage onEnter={() => setShowDashboard(true)} />;
  }

  return <Dashboard />;
};

export default Index;