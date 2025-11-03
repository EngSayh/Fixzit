import React from 'react';

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {}
interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}
/* eslint-disable no-unused-vars */
interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}
interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}
/* eslint-enable no-unused-vars */

/* eslint-disable no-unused-vars */
const TabsContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
}>({
  value: '',
  onValueChange: () => {}
});

export const Tabs: React.FC<TabsProps & { 
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}> = ({
/* eslint-enable no-unused-vars */ 
  className = '', 
  defaultValue = '',
  value: controlledValue,
  onValueChange: controlledOnChange,
  children,
  ...props 
}) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  
  // Use controlled value if provided, otherwise use internal state
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const onValueChange = controlledOnChange || setInternalValue;

  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={`w-full ${className}`} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export const TabsList: React.FC<TabsListProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`inline-flex h-10 items-center justify-center rounded-2xl bg-muted p-1 text-muted-foreground ${className}`}
      {...props}
    />
  );
};

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ 
  className = '', 
  value,
  children,
  ...props 
}) => {
  const { value: selectedValue, onValueChange } = React.useContext(TabsContext);
  const isActive = value === selectedValue;

  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
        isActive
          ? 'bg-card text-foreground shadow-sm'
          : 'text-foreground hover:text-foreground'
      } ${className}`}
      onClick={() => onValueChange(value)}
      {...props}
    >
      {children}
    </button>
  );
};

export const TabsContent: React.FC<TabsContentProps> = ({ 
  className = '', 
  value,
  children,
  ...props 
}) => {
  const { value: selectedValue } = React.useContext(TabsContext);

  if (value !== selectedValue) {
    return null;
  }

  return (
    <div
      className={`mt-2 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
