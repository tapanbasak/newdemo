"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { AGENTS, GROUPS } from "@/lib/data";
import { sharePrompt } from "@/lib/client-api";

export default function SharePromptPage() {
  const [audience, setAudience] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [attachments, setAttachments] = useState("");
  const [success, setSuccess] = useState(false);
  const audienceGroups = useMemo(() => GROUPS.filter((g) => g.slug !== "my-upvotes"), []);

  function isAudienceSelected(identifier: string) {
    return audience.includes(identifier);
  }

  function toggleAudience(identifier: string, checked: boolean) {
    setAudience((prev) =>
      checked ? Array.from(new Set([...prev, identifier])) : prev.filter((v) => v !== identifier)
    );
  }

  function toggleGroupExpanded(slug: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function getAgentsForGroup(groupSlug: string) {
    return AGENTS.filter((a) => a.category === groupSlug);
  }

  function onAttachmentsSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    const names = files ? Array.from(files).map((f) => f.name).join(", ") : "";
    setAttachments(names);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    await sharePrompt({
      title: String(form.get("title") || ""),
      createdBy: String(form.get("createdBy") || ""),
      createdBySoeid: String(form.get("createdBySoeid") || ""),
      audience: audience.join(", "),
      prompt: String(form.get("prompt") || ""),
      description: String(form.get("description") || ""),
      attachments,
    });
    formEl.reset();
    setAudience([]);
    setExpandedGroups(new Set());
    setAttachments("");
    setSuccess(true);
  }

  return (
    <div className="share-page-wrapper pcu-page-body">
      <nav className="breadcrumb">
        <Link href="/prompt-catchup">Prompt Catch Up</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Share Your Prompt</span>
      </nav>

      <div className="share-page">
        <aside className="share-sidebar">
          <div className="sidebar-search">
            <input type="text" className="sidebar-search-input" placeholder="Search for Prompts" />
          </div>
          <nav className="sidebar-nav">
            <Link href="/prompt-catchup/share" className="sidebar-link active">
              Share your Prompt
            </Link>
            <Link href="/prompt-catchup" className="sidebar-link">
              Home
            </Link>
          </nav>
        </aside>

        <main className="share-main">
          {success ? <div className="success-banner">Your prompt has been shared successfully.</div> : null}
          <h1 className="page-title">Share Your Prompt</h1>
          <section className="section">
            <h2 className="section-title">Basic Information</h2>
            <form onSubmit={onSubmit}>
              <div className="grid-row">
                <div className="field">
                  <label>Title</label>
                  <input required type="text" name="title" />
                </div>
                <div className="field">
                  <label>Created by</label>
                  <input required type="text" name="createdBy" />
                </div>
                <div className="field">
                  <label>Created by SOEID</label>
                  <input required type="text" name="createdBySoeid" />
                </div>
              </div>

              <div className="grid-row">
                <div className="field wide">
                  <label>Who could make use of this Prompt? (e.g., roles, agents, assistants)</label>
                  <div className="audience-section">
                    <div className="audience-tags">
                      {audienceGroups.map((g) => (
                        <label className="audience-chip group-chip" key={g.slug}>
                          <input
                            type="checkbox"
                            checked={isAudienceSelected(g.slug)}
                            onChange={(e) => toggleAudience(g.slug, e.target.checked)}
                          />
                          {g.name}
                        </label>
                      ))}
                    </div>

                    {audienceGroups.map((g) => (
                      <div
                        className="sub-groups"
                        key={`sub-${g.slug}`}
                        style={{
                          display:
                            isAudienceSelected(g.slug) && getAgentsForGroup(g.slug).length > 0
                              ? "block"
                              : "none",
                        }}
                      >
                        <div className="sub-group-header" onClick={() => toggleGroupExpanded(g.slug)}>
                          <span className="expand-icon">{expandedGroups.has(g.slug) ? "▼" : "▶"}</span>
                          <span>{g.name} &gt;</span>
                        </div>
                        {expandedGroups.has(g.slug) ? (
                          <div className="sub-group-items">
                            {getAgentsForGroup(g.slug).map((agent) => {
                              const key = `agent:${agent.id}`;
                              return (
                                <label className="audience-chip sub-chip" key={key}>
                                  <input
                                    type="checkbox"
                                    checked={isAudienceSelected(key)}
                                    onChange={(e) => toggleAudience(key, e.target.checked)}
                                  />
                                  {agent.name}
                                </label>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label>Attachments</label>
                  <input type="file" multiple onChange={onAttachmentsSelected} />
                  {attachments ? <small>{attachments}</small> : null}
                </div>
              </div>

              <div className="field">
                <label>Prompt</label>
                <textarea
                  required
                  rows={4}
                  name="prompt"
                  placeholder='Please ensure to define the variable fields with "[]" for "template" format prompts'
                />
              </div>

              <div className="field">
                <label>Description</label>
                <textarea
                  rows={3}
                  name="description"
                  placeholder="How it works, how to use it, and how to get the most from it."
                />
              </div>

              <div className="submit-row">
                <button type="submit" className="submit-btn">
                  Submit
                </button>
              </div>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}
