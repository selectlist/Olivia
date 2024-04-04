from typing import *
import json, re, bs4, requests, marko, marko.ext.gfm as gfm, joblib, glob

memory = joblib.Memory("cachedir", verbose=0)
@memory.cache
def http_get(url: str) -> str:
    return requests.get(url).text

def convert_discord_to_github_link(url: str) -> str:
    query = "developers/docs/"
    path = url[url.find(query) + len(query):]
    filename = path[path.rfind("/")+1:]
    new_filename = "_".join(word[0].upper() + word[1:] for word in filename.split("-"))
    path = path.replace(filename, new_filename)
    return f"https://raw.githubusercontent.com/discord/discord-api-docs/main/docs/{path}.md"

def find_markdown_after(url: str, words: [str]) -> Optional[str]:
    markdown = http_get(convert_discord_to_github_link(url))
    for i in range(len(words) - 1):
        query = "# " + " ".join(words[i:]) + "\n"
        pos = markdown.find(query)
        if pos != -1:
            return markdown[markdown.find(query) + len(query):]
    return None

def red(text: str) -> str:
    ANSI_RED_BOLD = "\033[31;1m"
    ANSI_RESET = "\033[0m"
    return ANSI_RED_BOLD + text + ANSI_RESET

renames = {}
for path in glob.iglob("../src/model/**/*.rs", recursive = True):
    regex = """#\[serde\(rename = "([a-z_]+)"\)\]\n    pub ([a-z_]+):"""
    renames_in_this_file = {match.group(2): match.group(1) for match in re.finditer(regex, open(path).read())}
    renames[path[path.find("src/model"):]] = renames_in_this_file
def rename_field(file_path: str, field: str) -> str:
    if file_path in renames:
        if field in renames[file_path]:
            return renames[file_path][field]
    return field

def check_struct(src_link: str, file_path: str, struct_name: str, fields: [str], discord_url: str):
    url, jump_to = discord_url.split("#")

    words = [word[0].upper() + word[1:] for word in jump_to.split("-")]
    markdown = find_markdown_after(url, words)
    outdated_docs_link = False
    if markdown is None:
        if url.endswith("/gateway"):
            url = url.replace("/gateway", "/gateway-events")
            discord_url = url + "#" + jump_to # used later
            markdown = find_markdown_after(url, words)
        if markdown is None:
            raise Exception(f"cannot find {jump_to} in {discord_url}")
        else:
            outdated_docs_link = True

    markdown = gfm.gfm.parse(markdown)
    table = next(child for child in markdown.children if isinstance(child, gfm.elements.Table))

    def marko_to_str(elem) -> str:
        if isinstance(elem, marko.inline.Emphasis):
            return f"_{marko_to_str(elem.children[0])}_"
        elif isinstance(elem, marko.inline.StrongEmphasis):
            return f"**{marko_to_str(elem.children[0])}**"

        try:
            children = getattr(elem, "children")
        except Exception:
            return str(elem)
        return "".join(marko_to_str(child) for child in children)

    table_cols = [marko_to_str(cell) for cell in table.children[0].children]
    rows = [{col: marko_to_str(cell) for col, cell in zip(table_cols, row.children)} for row in table.children[1:]]
    
    for row in rows:
        row["Field_cleaned"] = re.match(r"[A-Za-z_]*", row["Field"]).group(0)

    discord_fields = set(row["Field_cleaned"] for row in rows)
    serenity_fields = set(rename_field(file_path, field) for field in fields)
    
    missing_fields = list(discord_fields - serenity_fields)
    extra_fields = list(serenity_fields - discord_fields)

    if len(missing_fields) == 0 and len(extra_fields) == 0: return

    print(f"[{struct_name}]")
    print(f"Source link: {src_link}")
    print(f"Serenity link: https://serenity-rs.github.io/serenity/next/serenity/?search={struct_name}")
    print(f"Discord link: {discord_url}")
    if outdated_docs_link:
        print(red(f"Outdated Discord docs link on {struct_name}!"))
    if len(missing_fields) > 0:
        print(red(f"Missing fields: {missing_fields}"))
        for field in missing_fields:
            try:
                description = next(row["Description"] for row in rows if row["Field_cleaned"] == field)
                description = description[0].upper() + description[1:] + "."
            except Exception as e:
                print(json.dumps(rows, indent=4))
                print(e)
                exit(1)
                description = f"FAILED: {e}"
            print(f"    /// {description}")
            print(f"    pub {field}: AAA,")
    if len(extra_fields) > 0:
        print(red(f"Extra fields: {extra_fields}"))
    print()

twilight = json.load(open("twilight/target/doc/twilight-model.json"))

# check_struct("TriggerMetadata", [], "https://discord.com/developers/docs/resources/auto-moderation#auto-moderation-rule-object-trigger-metadata")
# exit(0)

for obj in sorted(twilight["index"].values(), key = lambda obj: obj["id"]):
    doc = obj.get("docs")
    if doc is None: continue
    
    if obj["kind"] != "struct": continue
    if not obj["span"]["filename"].startswith("src"): continue

    inner = obj["inner"]["kind"]
    if "plain" not in inner: continue
    fields = [serenity["index"][field]["name"] for field in inner["plain"]["fields"]]

    discord_url = re.search(r"\[Discord docs\]\((https.*)\)", doc)
    if discord_url is None: continue
    discord_url = discord_url.group(1)

    struct_name = obj["name"]
    file_path = obj["span"]["filename"]
    src_link = f'{obj["span"]["filename"]}:{obj["span"]["begin"][0]}:{obj["span"]["begin"][1]}'

    bitflag_structs = ["InteractionResponseFlags", "ApplicationFlags", "MessageFlags", "ChannelFlags", "ThreadMemberFlags", "SystemChannelFlags", "ActivityFlags", "GatewayIntents", "Permissions"]
    if struct_name in bitflag_structs:
        print(f"Skipping {struct_name} because this script doesn't support bitflags yet")
        continue
    if struct_name in ["Gateway", "InviteChannel"]:
        print(f"Skipping {struct_name} because the script can't read example response codeblocks")
        continue
    if struct_name in ["ReactionRemoveEmojiEvent", "GuildScheduledEventUpdateEvent", "ThreadCreateEvent", "CommandPermissionsUpdateEvent", "ChannelCreateEvent", "ThreadMemberUpdateEvent", "AutoModRuleCreateEvent", "AutoModRuleUpdateEvent", "AutoModRuleDeleteEvent", "AutoModActionExecutionEvent", "ChannelDeleteEvent", "ChannelUpdateEvent", "GuildAuditLogEntryCreateEvent", "GuildCreateEvent", "GuildDeleteEvent", "GuildMemberAddEvent", "GuildUpdateEvent", "MessageCreateEvent", "MessageUpdateEvent", "PresenceUpdateEvent", "ReactionAddEvent", "ReactionRemoveEvent", "ReactionRemoveAllEvent"]:
        print(f"Skipping {struct_name} because #[serde(transparent)] and the Discord docs only contain a link which this script can't read")
        continue
    if struct_name in ["Role"]:
        print(f"Skipping {struct_name} as FP due to serenity's virtual guild_id field")
        continue
    if struct_name in ["ThreadMember", "Message"]:
        print(f"Skipping {struct_name} as FP due to extra field(s) in some contexts")
        continue
    if struct_name in ["Sticker"]:
        print(f"Skipping {struct_name} as FP because the only missing field is deprecated by Discord")
        continue
    if struct_name in ["PartialGuildChannel", "UnavailableGuild", "PartialChannel"]:
        print(f"Skipping {struct_name} as FP due to not recognizing type subsets")
        continue
    if struct_name in ["PermissionOverwrite"]:
        print(f"Skipping {struct_name} as FP due to not recognizing multiple fields being abstracted by an enum in the kind field")
        continue
    if struct_name in ["GuildChannel"]:
        print(f"Skipping {struct_name} as FP because those fields are about group DMs, which GuildChannel is not about")
        continue
    if struct_name in ["GuildRoleCreateEvent", "GuildRoleUpdateEvent"]:
        print(f"Skipping {struct_name} as FP due to manual (De)Serialize implementation")
        continue
    if struct_name in ["PrivateChannel", "MessageApplication"]:
        print(f"Tentatively skipping {struct_name} as FP because I can't find docs about this type subset anywhere")
        continue


    # check_struct(src_link, file_path, struct_name, fields, discord_url)
    try:
        check_struct(src_link, file_path, struct_name, fields, discord_url)
    except Exception as e:
        print(red(f"Exception: {e}"))
