import { Box, Text } from "@chakra-ui/react";

const ErrorFallback = ({ error }: any) => {
  return (
    <Box role="alert">
      <Text>Something went wrong:</Text>
      <Text color="red">{error.message}</Text>
    </Box>
  );
};

export default ErrorFallback;
