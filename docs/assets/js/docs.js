/* ==========================================================================
   Happy Vibecode Documentation JS
   Theme toggle, sidebar navigation, search, copy-to-clipboard
   ========================================================================== */

;(function () {
	'use strict'

	/* ── Theme Toggle ─────────────────────────────────────────────────── */
	function initTheme() {
		var stored = localStorage.getItem('docs-theme')
		var prefersDark =
			window.matchMedia &&
			window.matchMedia('(prefers-color-scheme: dark)').matches
		var theme = stored || (prefersDark ? 'dark' : 'light')
		document.documentElement.setAttribute('data-theme', theme)

		var toggle = document.querySelector('.theme-toggle')
		if (toggle) {
			toggle.setAttribute('aria-pressed', theme === 'dark')
			toggle.setAttribute(
				'aria-label',
				'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' theme',
			)
			toggle.addEventListener('click', function () {
				var current = document.documentElement.getAttribute('data-theme')
				var next = current === 'dark' ? 'light' : 'dark'
				document.documentElement.setAttribute('data-theme', next)
				localStorage.setItem('docs-theme', next)
				toggle.setAttribute('aria-pressed', next === 'dark')
				toggle.setAttribute(
					'aria-label',
					'Switch to ' + (next === 'dark' ? 'light' : 'dark') + ' theme',
				)
			})
		}

		if (window.matchMedia) {
			window
				.matchMedia('(prefers-color-scheme: dark)')
				.addEventListener('change', function (e) {
					if (!localStorage.getItem('docs-theme')) {
						document.documentElement.setAttribute(
							'data-theme',
							e.matches ? 'dark' : 'light',
						)
					}
				})
		}
	}

	/* ── Mobile Sidebar ───────────────────────────────────────────────── */
	function initSidebar() {
		var toggle = document.querySelector('.menu-toggle')
		var sidebar = document.querySelector('.docs-sidebar')
		var overlay = document.querySelector('.sidebar-overlay')
		if (!toggle || !sidebar) return

		function open() {
			sidebar.classList.add('open')
			if (overlay) overlay.classList.add('active')
			toggle.setAttribute('aria-expanded', 'true')
			sidebar.setAttribute('aria-hidden', 'false')
		}

		function close() {
			sidebar.classList.remove('open')
			if (overlay) overlay.classList.remove('active')
			toggle.setAttribute('aria-expanded', 'false')
			sidebar.setAttribute('aria-hidden', 'true')
		}

		toggle.addEventListener('click', function () {
			if (sidebar.classList.contains('open')) {
				close()
			} else {
				open()
			}
		})

		if (overlay) {
			overlay.addEventListener('click', close)
		}

		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && sidebar.classList.contains('open')) {
				close()
				toggle.focus()
			}
		})

		// Close sidebar on link click (mobile)
		sidebar.querySelectorAll('.sidebar-nav__link').forEach(function (link) {
			link.addEventListener('click', function () {
				if (window.innerWidth <= 768) {
					close()
				}
			})
		})
	}

	/* ── Active Nav Link ──────────────────────────────────────────────── */
	function initActiveNav() {
		var path = window.location.pathname.split('/').pop() || 'index.html'
		var links = document.querySelectorAll('.sidebar-nav__link')
		links.forEach(function (link) {
			var href = link.getAttribute('href')
			if (href === path || (path === '' && href === 'index.html')) {
				link.classList.add('active')
				link.setAttribute('aria-current', 'page')
			}
		})
	}

	/* ── Search ───────────────────────────────────────────────────────── */
	function initSearch() {
		var input = document.querySelector('.search-input')
		var resultsContainer = document.querySelector('.search-results')
		if (!input || !resultsContainer) return

		var searchIndex = window.DOCS_SEARCH_INDEX || []
		var debounceTimer = null

		function search(query) {
			if (!query || query.length < 2) {
				resultsContainer.classList.remove('active')
				resultsContainer.innerHTML = ''
				return
			}

			var q = query.toLowerCase()
			var matches = []

			searchIndex.forEach(function (item) {
				var titleMatch = item.title.toLowerCase().indexOf(q) !== -1
				var contentMatch = item.content.toLowerCase().indexOf(q) !== -1
				if (titleMatch || contentMatch) {
					var score = titleMatch ? 2 : 1
					matches.push({item: item, score: score})
				}
			})

			matches.sort(function (a, b) {
				return b.score - a.score
			})

			if (matches.length === 0) {
				resultsContainer.innerHTML =
					'<div class="search-no-results">No results found</div>'
				resultsContainer.classList.add('active')
				return
			}

			var html = matches
				.slice(0, 8)
				.map(function (m) {
					var excerpt = ''
					var idx = m.item.content.toLowerCase().indexOf(q)
					if (idx !== -1) {
						var start = Math.max(0, idx - 40)
						var end = Math.min(m.item.content.length, idx + q.length + 60)
						excerpt =
							(start > 0 ? '...' : '') +
							m.item.content.substring(start, end) +
							(end < m.item.content.length ? '...' : '')
					} else {
						excerpt = m.item.content.substring(0, 80) + '...'
					}
					return (
						'<a class="search-result-item" href="' +
						m.item.url +
						'">' +
						'<div class="search-result-item__title">' +
						escapeHtml(m.item.title) +
						'</div>' +
						'<div class="search-result-item__excerpt">' +
						escapeHtml(excerpt) +
						'</div>' +
						'</a>'
					)
				})
				.join('')

			resultsContainer.innerHTML = html
			resultsContainer.classList.add('active')
		}

		input.addEventListener('input', function () {
			clearTimeout(debounceTimer)
			debounceTimer = setTimeout(function () {
				search(input.value.trim())
			}, 150)
		})

		input.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') {
				input.value = ''
				resultsContainer.classList.remove('active')
				resultsContainer.innerHTML = ''
				input.blur()
			}
		})

		document.addEventListener('click', function (e) {
			if (!input.contains(e.target) && !resultsContainer.contains(e.target)) {
				resultsContainer.classList.remove('active')
			}
		})

		// Keyboard shortcut: / to focus search
		document.addEventListener('keydown', function (e) {
			if (
				e.key === '/' &&
				document.activeElement.tagName !== 'INPUT' &&
				document.activeElement.tagName !== 'TEXTAREA'
			) {
				e.preventDefault()
				input.focus()
			}
		})
	}

	/* ── Copy to Clipboard ────────────────────────────────────────────── */
	function initCopyButtons() {
		document.querySelectorAll('.copy-button').forEach(function (btn) {
			btn.addEventListener('click', function () {
				var target = btn.getAttribute('data-target')
				var codeBlock = target
					? document.getElementById(target)
					: btn.closest('.code-block-wrapper')?.querySelector('code')
				if (!codeBlock) {
					var pre = btn.closest('.code-block-header')?.nextElementSibling
					if (pre) codeBlock = pre.querySelector('code')
				}
				if (!codeBlock) return

				var text = codeBlock.textContent
				navigator.clipboard.writeText(text).then(function () {
					var original = btn.textContent
					btn.textContent = 'Copied!'
					setTimeout(function () {
						btn.textContent = original
					}, 2000)
				})
			})
		})
	}

	/* ── Utility ──────────────────────────────────────────────────────── */
	function escapeHtml(str) {
		var div = document.createElement('div')
		div.appendChild(document.createTextNode(str))
		return div.innerHTML
	}

	/* ── Init ─────────────────────────────────────────────────────────── */
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init)
	} else {
		init()
	}

	function init() {
		initTheme()
		initSidebar()
		initActiveNav()
		initSearch()
		initCopyButtons()
	}
})()
