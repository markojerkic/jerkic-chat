import m0000 from "./0000_dazzling_tempest.sql";
import m0001 from "./0001_add_thread_forked.sql";
import journal from "./meta/_journal.json";

export default {
  journal,
  migrations: {
    m0000,
    m0001,
  },
};
