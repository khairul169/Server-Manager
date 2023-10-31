import { useInfiniteQuery, useQuery } from "react-query";
import api from "../../services/api";
import { useEffect, useRef, useState } from "react";
import {
  Box,
  Card,
  GridItem,
  HStack,
  Input,
  Select,
  SimpleGrid,
  Skeleton,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallback from "../../components/ErrorFallback";
import { useBottomScrollListener } from "react-bottom-scroll-listener";

const HomePage = () => {
  const [curServer, setCurServer] = useState<any>();
  const [viewRequest, setViewRequest] = useState<any>();
  const [date, setDate] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );

  const { data: servers } = useQuery({
    queryKey: ["servers"],
    queryFn: () => api.get("/servers").then((i) => i.data),
  });

  useEffect(() => {
    if (!curServer && servers?.length > 0) {
      setCurServer(servers[0]);
    }
  }, [servers, curServer, setCurServer]);

  return (
    <Box p={8}>
      <HStack>
        <Select flex={1}>
          {servers?.map((item: any) => (
            <option key={item.id}>{item.server_id}</option>
          ))}
        </Select>
        <Input
          w="auto"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </HStack>

      <StatsSection date={date} curServer={curServer} />

      <Tabs mt={2} variant="enclosed">
        <TabList>
          <Tab>Requests</Tab>
          <Tab>App Logs</Tab>
        </TabList>

        <TabPanels>
          <TabPanel p={0}>
            <SimpleGrid mt={8} columns={{ base: 1, sm: 2 }} spacing={8}>
              <GridItem>
                <Text>Requests</Text>

                <RequestList
                  date={date}
                  curServer={curServer}
                  onSelect={setViewRequest}
                />
              </GridItem>

              {viewRequest ? <ViewRequest id={viewRequest.id} /> : null}
            </SimpleGrid>
          </TabPanel>

          <TabPanel px={0}>
            <LogsView curServer={curServer} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

const StatsSection = ({ curServer, date }: any) => {
  const { data } = useQuery({
    queryKey: ["stats", curServer?.id, date],
    queryFn: () =>
      api
        .get("/stats", { params: { server_id: curServer?.server_id, date } })
        .then((i) => i.data),
    enabled: !!curServer,
  });

  const statsItems = [
    {
      title: "Total Requests",
      value: data?.total_requests || 0,
    },
    {
      title: "Running Time",
      value: `${data?.running_time?.toFixed(1) || 0}s` || 0,
    },
  ];

  return (
    <HStack spacing={4} my={4}>
      {statsItems.map((item, idx) => (
        <Card key={idx} flex={1} p={4}>
          <Text textAlign="center" fontSize="lg">
            {item.value}
          </Text>
          <Text textAlign="center" fontSize="sm">
            {item.title}
          </Text>
        </Card>
      ))}
    </HStack>
  );
};

const RequestList = ({ curServer, date, onSelect }: any) => {
  const params = { server_id: curServer?.server_id, date };
  const {
    data: requests,
    hasNextPage,
    isFetching,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["requests", params],
    queryFn: ({ pageParam = 1 }) =>
      api
        .get("/requests", { params: { ...params, page: pageParam } })
        .then((i) => ({ rows: i.data, page: pageParam })),
    enabled: !!curServer,
    getNextPageParam: (lastPage) =>
      lastPage.rows?.length > 0 ? lastPage.page + 1 : undefined,
    refetchOnWindowFocus: false,
  });

  const scrollRef = useBottomScrollListener(() => {
    if (hasNextPage && !isFetching) {
      fetchNextPage();
    }
  });

  return (
    <VStack
      ref={scrollRef as any}
      mt={2}
      maxH="600px"
      overflowY="auto"
      alignItems="stretch"
      spacing={0}
    >
      {requests?.pages
        .flatMap((i) => i.rows)
        .map((item: any) => {
          const { pathname } = new URL(item.url);

          return (
            <Box
              key={item.id}
              as="button"
              textAlign="left"
              borderBottomWidth={1}
              py={2}
              _hover={{ bg: "gray.100" }}
              onClick={() => onSelect(item)}
            >
              <HStack alignItems="center">
                <Text fontWeight="bold">{item.method}</Text>
                <Text flex={1}>{pathname}</Text>
                <Text>{item.status}</Text>
              </HStack>
              <Text fontSize="xs">{item.created_at}</Text>
            </Box>
          );
        })}

      {isFetching
        ? [...Array(5)].map((_, key) => (
            <Box mt={2}>
              <Skeleton key={key} h="60px" />
            </Box>
          ))
        : null}
    </VStack>
  );
};

const ViewRequest = ({ id }: any) => {
  const { data, isLoading } = useQuery({
    queryKey: ["request", id],
    queryFn: () => api.get("/request", { params: { id } }).then((i) => i.data),
  });

  if (isLoading) {
    return <Text>Loading...</Text>;
  }
  if (!data) {
    return <Text>Error!</Text>;
  }

  const { request, request_body, response, response_body } = data;

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Box>
        <HStack>
          <Input
            value={request.method}
            w={20}
            px={1}
            textAlign="center"
            fontWeight="bold"
          />
          <Input value={request.url} />
        </HStack>

        <Tabs mt={2} variant="enclosed">
          <TabList>
            <Tab>Response</Tab>
            <Tab>Request</Tab>
          </TabList>

          <TabPanels>
            <ReqResPanel data={response} body={response_body} />
            <ReqResPanel data={request} body={request_body} />
          </TabPanels>
        </Tabs>
      </Box>
    </ErrorBoundary>
  );
};

const ReqResPanel = ({ data, body }: any) => {
  return (
    <TabPanel p={0}>
      <Tabs>
        <TabList>
          <Tab>Body</Tab>
          <Tab>Headers</Tab>
        </TabList>

        <TabPanels>
          <TabPanel px={0}>
            <BodyView contentType={data.headers["content-type"]} body={body} />
          </TabPanel>
          <TabPanel px={0}>
            <HeaderView headers={data.headers} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </TabPanel>
  );
};

const BodyView = ({ contentType = "", body }: any) => {
  if (!body) {
    return <Text>No Data</Text>;
  }

  if (
    contentType.startsWith("image/") &&
    typeof body === "object" &&
    body.uri
  ) {
    return <Text>Image</Text>;
  }

  let content = typeof body === "string" ? body : JSON.stringify(body);
  if (contentType === "application/json") {
    content = JSON.stringify(JSON.parse(content), null, 2);
  }

  return <Textarea value={content} minH="500px" />;
};

const HeaderView = ({ headers }: any) => {
  return (
    <VStack alignItems="stretch" maxH="500px" overflowY="auto">
      {Object.keys(headers).map((key) => {
        const value = headers[key];

        return (
          <HStack>
            <Text w="200px" isTruncated>
              {key}
            </Text>
            <Input flex={1} value={value} />
          </HStack>
        );
      })}
    </VStack>
  );
};

const LogsView = ({ curServer }: any) => {
  const logsRef = useRef<HTMLTextAreaElement>(null);
  const followRef = useRef<boolean>(true);

  const { data: logs } = useQuery({
    queryKey: ["logs", curServer?.id],
    queryFn: () =>
      api
        .get("/logs", { params: { server_id: curServer.server_id } })
        .then((i) => i.data.data),
    enabled: !!curServer,
  });

  useEffect(() => {
    const scrollToBottom = () => {
      const el = logsRef.current;
      if (!el) {
        return;
      }

      const diff = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (
        diff > el.clientHeight &&
        diff < el.scrollHeight - el.clientHeight &&
        followRef.current
      ) {
        followRef.current = false;
      }

      if (
        (diff <= el.clientHeight ||
          diff >= el.scrollHeight - el.clientHeight) &&
        !followRef.current
      ) {
        followRef.current = true;
      }

      if (followRef.current) {
        el.scrollBy({ top: el.scrollHeight, behavior: "smooth" });
      }
    };

    scrollToBottom();

    const interval = setInterval(scrollToBottom, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [logs]);

  return <Textarea ref={logsRef} mt={2} value={logs} minH="500px" />;
};

export default HomePage;
