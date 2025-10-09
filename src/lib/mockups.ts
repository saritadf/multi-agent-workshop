export interface MockupData {
  type?: 'website' | 'mobile' | 'desktop' | 'wireframe' | 'architecture' | 'planning' | 'product' | 'business' | 'summary' | 'figma';
  description?: string;
  imageUrl?: string;
  prompt?: string;
  
  // Design-specific
  screens?: string[] | string | Array<{name: string, components: string[]}>;
  style?: string;
  colors?: string[];
  typography?: string;
  spacing?: string;
  
  // Developer-specific
  technologies?: string[] | string;
  timeline?: string;
  complexity?: string;
  
  // PM-specific
  phases?: Array<{name: string, duration: string, resources: string}>;
  budget?: string;
  
  // Summary-specific (for Moderator)
  decisions?: string[];
  team?: string;
  risks?: string[];
  nextSteps?: string[];
  
  // Product-specific
  userJourney?: string[];
  kpis?: string[] | string;
  features?: string[] | string;
  
  // Business-specific
  revenue?: string;
  costs?: string;
  roi?: string;
  model?: string;
  
  // Generic
  [key: string]: any;
}

export function parseResponseForMockup(response: string): MockupData | null {
  // Look for MOCKUP_DATA: marker in the response
  if (!response.includes('MOCKUP_DATA:')) {
    return null;
  }

  try {
    const parts = response.split('MOCKUP_DATA:');
    if (parts.length < 2) return null;

    const mockupDataString = parts[1].trim();
    const mockupData: MockupData = JSON.parse(mockupDataString);
    
    return mockupData;
  } catch (error) {
    console.error('Failed to parse mockup data:', error);
    return null;
  }
}

export function generateMockupPrompt(type: string, description: string): string {
  return `Create a ${type} mockup for: ${description}. Make it modern and user-friendly.`;
}