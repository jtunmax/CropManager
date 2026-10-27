import { motion } from 'framer-motion';
import { TreePine, Leaf, MapPin, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/ArcGISAuthContext';
import { Button } from '@/components/ui/button';

export function LoginPage() {
  const { signIn, isLoading } = useAuth();

  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary via-canopy to-background" />
      
      {/* Floating leaves decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-primary-foreground/20"
            initial={{ 
              x: Math.random() * 100 + '%', 
              y: -50,
              rotate: 0 
            }}
            animate={{ 
              y: '120vh',
              rotate: 360,
              x: `calc(${Math.random() * 100}% + ${Math.sin(i) * 100}px)`
            }}
            transition={{ 
              duration: 15 + Math.random() * 10,
              repeat: Infinity,
              delay: i * 2,
              ease: 'linear'
            }}
          >
            <Leaf size={24 + Math.random() * 24} />
          </motion.div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-md"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary-foreground/10 backdrop-blur-sm mb-8 border border-primary-foreground/20"
          >
            <TreePine className="w-12 h-12 text-primary-foreground" />
          </motion.div>

          <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4 tracking-tight">
            Belize Tree Planting Tracker
          </h1>
          
          <p className="text-primary-foreground/80 text-lg mb-8 leading-relaxed">
            Track, verify, and celebrate every tree planted. 
            Building a greener future, one tree at a time.
          </p>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { icon: MapPin, label: 'Geo Location' },
              { icon: TreePine, label: 'Tree Types' },
              { icon: Shield, label: 'Verified' },
            ].map((feature, i) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex flex-col items-center gap-2 p-3 rounded-lg bg-primary-foreground/5 backdrop-blur-sm border border-primary-foreground/10"
              >
                <feature.icon className="w-5 h-5 text-primary-foreground/70" />
                <span className="text-xs text-primary-foreground/70">{feature.label}</span>
              </motion.div>
            ))}
          </div>

          {/* Sign in button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <Button
              onClick={handleSignIn}
              disabled={isLoading}
              size="lg"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold px-8 py-6 text-base shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Leaf className="w-5 h-5" />
                  </motion.span>
                  Connecting...
                </span>
              ) : (
                'Sign in with ArcGIS Online'
              )}
            </Button>
            
            <p className="mt-4 text-sm text-primary-foreground/60">
              Requires an ArcGIS Online account
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="relative z-10 py-6 text-center">
        <p className="text-sm text-primary-foreground/40">
          © 2024 Forest Trees Tracker. All rights reserved.
        </p>
      </div>
    </div>
  );
}