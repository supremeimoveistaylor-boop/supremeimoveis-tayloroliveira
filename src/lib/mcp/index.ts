import { defineMcp } from "@lovable.dev/mcp-js";
import searchProperties from "./tools/search-properties";
import getProperty from "./tools/get-property";
import listFeaturedProperties from "./tools/featured-properties";

export default defineMcp({
  name: "supreme-empreendimentos-mcp",
  title: "Supreme Empreendimentos MCP",
  version: "0.1.0",
  instructions:
    "Tools for the Supreme Empreendimentos real-estate catalog in Goiânia. Use `search_properties` to filter listings by purpose, type, bedrooms, price, or location; `list_featured_properties` for highlighted homes; `get_property` for full details by ID.",
  tools: [searchProperties, listFeaturedProperties, getProperty],
});
