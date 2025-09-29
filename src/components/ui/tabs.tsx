import React from &apos;react&apos;;

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {}
interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}
interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}
interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
}>({
  value: &apos;',
  onValueChange: () => {}
});

export const Tabs: React.FC<TabsProps & { defaultValue?: string }> = ({ 
  className = &apos;', 
  defaultValue = &apos;',
  children,
  ...props 
}) => {
  const [value, setValue] = React.useState(defaultValue);

  return (
    <TabsContext.Provider value={{ value, onValueChange: setValue }}>
      <div className={`w-full ${className}`} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export const TabsList: React.FC<TabsListProps> = ({ className = &apos;', ...props }) => {
  return (
    <div
      className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500 ${className}`}
      {...props}
    />
  );
};

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ 
  className = &apos;', 
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
          ? &apos;bg-white text-gray-900 shadow-sm&apos;
          : &apos;text-gray-700 hover:text-gray-900&apos;
      } ${className}`}
      onClick={() => onValueChange(value)}
      {...props}
    >
      {children}
    </button>
  );
};

export const TabsContent: React.FC<TabsContentProps> = ({ 
  className = &apos;', 
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
