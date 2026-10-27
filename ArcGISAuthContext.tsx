import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import esriConfig from '@arcgis/core/config';
import OAuthInfo from '@arcgis/core/identity/OAuthInfo';
import IdentityManager from '@arcgis/core/identity/IdentityManager';
import Portal from '@arcgis/core/portal/Portal';

interface User {
  username: string;
  fullName: string;
  email: string;
  thumbnailUrl: string | null;
  orgId: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: () => Promise<void>;
  signOut: () => void;
  portal: Portal | null;
  credential: __esri.Credential | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ArcGIS Online OAuth configuration
const ARCGIS_PORTAL_URL = 'https://www.arcgis.com';
const APP_ID = 'o7kOXwKklpKKXBfo';

export function ArcGISAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [portal, setPortal] = useState<Portal | null>(null);
  const [credential, setCredential] = useState<__esri.Credential | null>(null);

  useEffect(() => {
    // Configure esri
    esriConfig.portalUrl = ARCGIS_PORTAL_URL;

    // Set up OAuth
    const oAuthInfo = new OAuthInfo({
      appId: APP_ID,
      portalUrl: ARCGIS_PORTAL_URL,
      popup: false,
      flowType: 'auto',
      preserveUrlHash: true,
    });

    IdentityManager.registerOAuthInfos([oAuthInfo]);

    // Check for existing authentication
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      
      const cred = await IdentityManager.checkSignInStatus(`${ARCGIS_PORTAL_URL}/sharing`);
      setCredential(cred);
      
      const portalInstance = new Portal({ url: ARCGIS_PORTAL_URL });
      await portalInstance.load();
      
      setPortal(portalInstance);
      setUser({
        username: portalInstance.user.username,
        fullName: portalInstance.user.fullName,
        email: portalInstance.user.email || '',
        thumbnailUrl: portalInstance.user.thumbnailUrl,
        orgId: portalInstance.user.orgId || '',
      });
    } catch (error) {
      // Not signed in
      setUser(null);
      setPortal(null);
      setCredential(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const cred = await IdentityManager.getCredential(`${ARCGIS_PORTAL_URL}/sharing`);
      setCredential(cred);
      
      const portalInstance = new Portal({ url: ARCGIS_PORTAL_URL });
      await portalInstance.load();
      
      setPortal(portalInstance);
      setUser({
        username: portalInstance.user.username,
        fullName: portalInstance.user.fullName,
        email: portalInstance.user.email || '',
        thumbnailUrl: portalInstance.user.thumbnailUrl,
        orgId: portalInstance.user.orgId || '',
      });
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(() => {
    IdentityManager.destroyCredentials();
    setUser(null);
    setPortal(null);
    setCredential(null);
    window.location.reload();
  }, []);

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isLoading, 
        isAuthenticated: !!user, 
        signIn, 
        signOut, 
        portal,
        credential,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an ArcGISAuthProvider');
  }
  return context;
}