# G-WEB-018 — Runtime State Specification

request → authenticate → authorize → validate upstream → response; any missing authority, invalid DTO or unsafe timeout → privacy-safe error; partial response only when approved DTO explicitly marks unavailable fields.

Recovery is limited to the approved read/presentation contract. Mutations and domain policy are outside this goal.
