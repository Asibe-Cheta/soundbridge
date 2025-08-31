/// <reference types="react" />
/// <reference types="react-dom" />

// JSX namespace is already provided by React types, so we don't need to declare it here
// The React types will handle JSX.IntrinsicElements properly

declare module '*.svg' {
  const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

declare global {
  interface Window {
    FB: {
      init: (params: any) => void;
      ui: (params: any, callback?: (response: any) => void) => void;
      login: (callback: (response: any) => void, params?: any) => void;
      getLoginStatus: (callback: (response: any) => void) => void;
    };
    gapi: {
      load: (api: string, callback: () => void) => void;
      auth2: {
        init: (params: any) => void;
        getAuthInstance: () => {
          isSignedIn: {
            get: () => boolean;
          };
          signIn: () => Promise<any>;
          signOut: () => Promise<any>;
        };
      };
    };
  }
}

export {};
