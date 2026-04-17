import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Send } from "lucide-react";
import { LeadsImobiliariosPanel } from "./LeadsImobiliariosPanel";
import { BrokerNotificationsPanel } from "./BrokerNotificationsPanel";

export const LeadsTabsPanel = () => {
  return (
    <Tabs defaultValue="leads" className="space-y-4">
      <TabsList>
        <TabsTrigger value="leads">
          <Users className="h-4 w-4 mr-2" />
          Leads do Site
        </TabsTrigger>
        <TabsTrigger value="broker-notifications">
          <Send className="h-4 w-4 mr-2" />
          Enviados ao Corretor
        </TabsTrigger>
      </TabsList>

      <TabsContent value="leads">
        <LeadsImobiliariosPanel />
      </TabsContent>

      <TabsContent value="broker-notifications">
        <BrokerNotificationsPanel />
      </TabsContent>
    </Tabs>
  );
};
