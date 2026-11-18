(function () {
    var K = { mat: "emp_materiais", emp: "emp_emprestimos", cli: "emp_clientes", logo: "emp_logo" };
    var mem = {};
    function load(k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def } catch (e) { return mem[k] !== undefined ? mem[k] : def } }
    function save(k, v) { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) { } }
    var $ = function (id) { return document.getElementById(id) };
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] }) }
    function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

    var materiais = load(K.mat, null);
    if (!materiais) { materiais = ["Bola de futebol", "Skate", "Bola de vôlei", "Raquete de beach tennis"].map(function (n) { return { id: uid(), nome: n } }); save(K.mat, materiais) }
    var emprestimos = load(K.emp, []);
    // Clientes de exemplo (simula o banco). Troque buscarClienteNoBanco por uma chamada à sua API.
    var clientes = load(K.cli, null);
    if (!clientes) { clientes = { "PUL001": { nome: "Maria Souza", cpf: "123.456.789-09" }, "PUL002": { nome: "João Pereira", cpf: "987.654.321-00" } }; save(K.cli, clientes) }

    var selecionado = null, achou = false;

    function buscarClienteNoBanco(codigo) {
        // Substitua por: return fetch("/api/clientes?qr="+encodeURIComponent(codigo)).then(r=>r.ok?r.json():null)
        return Promise.resolve(clientes[codigo] || null);
    }
    function aberto(mid) { return emprestimos.find(function (e) { return e.materialId === mid && !e.devolvidoEm }) }
    function maskCpf(v) { v = v.replace(/\D/g, "").slice(0, 11); return v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2") }
    function fmt(d) { return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) }
    function msg(t, c) { var m = $("msg"); m.textContent = t || ""; m.className = "msg " + (c || "") }

    function renderMat() {
        $("materiais").innerHTML = materiais.map(function (m) {
            var emp = aberto(m.id);
            return '<button class="mat' + (selecionado === m.id ? ' sel' : '') + '" data-id="' + m.id + '"' + (emp ? ' disabled' : '') + '><b>' + esc(m.nome) + '</b><span class="tag ' + (emp ? 'emp' : 'livre') + '">' + (emp ? 'Emprestado' : 'Disponível') + '</span></button>'
        }).join("") || '<p class="vazio">Nenhum material cadastrado.</p>';
        var m = materiais.find(function (x) { return x.id === selecionado });
        $("selBox").innerHTML = m ? 'Material: <b>' + esc(m.nome) + '</b>' : 'Nenhum material selecionado';
        check();
    }
    function renderAtivos() {
        var a = emprestimos.filter(function (e) { return !e.devolvidoEm });
        if (!a.length) { $("ativos").innerHTML = '<p class="vazio">Nenhum empréstimo em aberto.</p>'; return }
        $("ativos").innerHTML = '<table><thead><tr><th>Material</th><th>Cliente</th><th>CPF</th><th>Retirada</th><th></th></tr></thead><tbody>' +
            a.map(function (e) { return '<tr><td>' + esc(e.material) + '</td><td>' + esc(e.nome) + '</td><td>' + esc(e.cpf) + '</td><td>' + fmt(e.retiradoEm) + '</td><td><button class="b sec" data-dev="' + e.id + '">Devolver</button></td></tr>' }).join("") + '</tbody></table>';
    }
    function check() {
        $("btnVincular").disabled = !(selecionado && $("nome").value.trim() && $("cpf").value.replace(/\D/g, "").length === 11);
    }
    function limpar() {
        $("qr").value = ""; $("nome").value = ""; $("cpf").value = "";
        $("nome").readOnly = false; $("cpf").readOnly = false; achou = false; selecionado = null;
        renderMat(); $("qr").focus();
    }

    $("materiais").addEventListener("click", function (ev) {
        var b = ev.target.closest(".mat"); if (!b || b.disabled) return;
        selecionado = b.dataset.id; renderMat(); $("qr").focus();
    });
    $("btnAdd").addEventListener("click", function () {
        var n = $("novoMat").value.trim(), m = $("msgAdd");
        if (!n) { m.textContent = "Digite o nome do material."; m.className = "msg err"; return }
        if (materiais.some(function (x) { return x.nome.toLowerCase() === n.toLowerCase() })) { m.textContent = "Esse material já existe."; m.className = "msg err"; return }
        materiais.push({ id: uid(), nome: n }); save(K.mat, materiais);
        $("novoMat").value = ""; m.textContent = "Material adicionado."; m.className = "msg ok"; renderMat();
    });
    $("novoMat").addEventListener("keydown", function (e) { if (e.key === "Enter") $("btnAdd").click() });

    function buscar() {
        var c = $("qr").value.trim(); if (!c) return;
        msg("Buscando…");
        buscarClienteNoBanco(c).then(function (cli) {
            if (cli) {
                $("nome").value = cli.nome; $("cpf").value = cli.cpf;
                $("nome").readOnly = true; $("cpf").readOnly = true; achou = true; msg("Cliente encontrado.", "ok");
            } else {
                $("nome").value = ""; $("cpf").value = "";
                $("nome").readOnly = false; $("cpf").readOnly = false; achou = false;
                msg("Cliente não encontrado. Preencha nome e CPF manualmente.", "warn"); $("nome").focus();
            }
            check();
        }).catch(function () { msg("Erro na busca. Preencha manualmente.", "err") });
    }
    $("btnBuscar").addEventListener("click", buscar);
    $("qr").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); buscar() } });
    $("nome").addEventListener("input", check);
    $("cpf").addEventListener("input", function () { this.value = maskCpf(this.value); check() });

    $("btnVincular").addEventListener("click", function () {
        var m = materiais.find(function (x) { return x.id === selecionado });
        if (!m || aberto(m.id)) return;
        var nome = $("nome").value.trim(), cpf = $("cpf").value, qr = $("qr").value.trim();
        emprestimos.push({ id: uid(), materialId: m.id, material: m.nome, nome: nome, cpf: cpf, qr: qr, retiradoEm: new Date().toISOString(), devolvidoEm: null });
        save(K.emp, emprestimos);
        if (qr && !achou) { clientes[qr] = { nome: nome, cpf: cpf }; save(K.cli, clientes) }
        renderAtivos(); limpar(); msg(m.nome + " vinculado a " + nome + ".", "ok");
    });
    $("ativos").addEventListener("click", function (ev) {
        var id = ev.target.getAttribute("data-dev"); if (!id) return;
        var e = emprestimos.find(function (x) { return x.id === id });
        if (e) { e.devolvidoEm = new Date().toISOString(); save(K.emp, emprestimos); renderMat(); renderAtivos() }
    });

    function setLogo(s) { var i = $("logoImg"); if (s) { i.src = s; i.hidden = false } else { i.removeAttribute("src"); i.hidden = true } $("logoPh").hidden = !!s; $("logoRm").hidden = !s }
    setLogo(load(K.logo, null));
    $("logoFile").addEventListener("change", function () {
        var f = this.files[0]; if (!f) return;
        var r = new FileReader();
        r.onload = function () {
            var im = new Image(); im.onload = function () {
                var h = Math.min(64, im.height), w = Math.round(im.width * h / im.height), c = document.createElement("canvas");
                c.width = w * 2; c.height = h * 2; c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
                var s = c.toDataURL("image/png"); save(K.logo, s); setLogo(s)
            }; im.src = r.result
        };
        r.readAsDataURL(f); this.value = "";
    });
    $("logoRm").addEventListener("click", function () { save(K.logo, null); setLogo(null) });

    renderMat(); renderAtivos();
})();