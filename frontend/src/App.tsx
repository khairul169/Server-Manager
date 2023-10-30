import { ChakraProvider } from "@chakra-ui/react";
import { useState } from "react";
import { QueryClientProvider, QueryClient } from "react-query";
import HomePage from "./pages/home/HomePage";

const App = () => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ChakraProvider>
      <QueryClientProvider client={queryClient}>
        <HomePage />
      </QueryClientProvider>
    </ChakraProvider>
  );
};

export default App;
